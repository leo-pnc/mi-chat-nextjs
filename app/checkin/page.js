'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, CalendarCheck, CircleCheck, Calendar, TrendingUp,
  Flame, HeartHandshake, HeartCrack, Heart,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getPartnerName, CHECKIN_MOODS, getWeekStart, formatWeekLabel, getCheckinMood } from '@/lib/config';

const WALLPAPER_ICONS = [Calendar, TrendingUp];
const WALLPAPER_POSITIONS = [
  { top: '4%', left: '8%', rotate: -12, size: 30 },
  { top: '9%', left: '78%', rotate: 18, size: 26 },
  { top: '20%', left: '35%', rotate: -6, size: 22 },
  { top: '28%', left: '92%', rotate: 10, size: 30 },
  { top: '36%', left: '4%', rotate: 22, size: 24 },
  { top: '15%', left: '55%', rotate: 24, size: 20 },
  { top: '48%', left: '58%', rotate: -18, size: 28 },
  { top: '58%', left: '18%', rotate: 8, size: 22 },
  { top: '68%', left: '85%', rotate: -10, size: 26 },
  { top: '78%', left: '45%', rotate: 16, size: 24 },
  { top: '88%', left: '10%', rotate: -20, size: 30 },
  { top: '95%', left: '70%', rotate: 12, size: 22 },
];

// Semana anterior a `weekStartStr` (mismo formato 'YYYY-MM-DD')
function prevWeek(weekStartStr) {
  const d = new Date(`${weekStartStr}T00:00:00`);
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

// Racha de semanas CONSECUTIVAS donde ambos respondieron, contando hacia
// atrás desde la última semana ya completa (si esta semana todavía está a
// medias, no rompe la racha anterior, solo no la suma todavía).
function computeStreak(weekMap, currentUser, partnerName) {
  const thisWeek = getWeekStart();
  const thisWeekEntries = weekMap[thisWeek];
  const currentComplete = !!(thisWeekEntries && thisWeekEntries[currentUser] && thisWeekEntries[partnerName]);

  let cursor = currentComplete ? thisWeek : prevWeek(thisWeek);
  let streak = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const entries = weekMap[cursor];
    if (entries && entries[currentUser] && entries[partnerName]) {
      streak += 1;
      cursor = prevWeek(cursor);
    } else {
      break;
    }
  }

  return { streak, currentComplete };
}

function getSyncMessage(diff) {
  if (diff === 0) return { title: 'Totalmente sincronizados', detail: 'Sienten exactamente lo mismo esta semana.', Icon: HeartHandshake };
  if (diff === 1) return { title: 'Bastante alineados', detail: 'Están cerca, con algún matiz distinto.', Icon: Heart };
  if (diff === 2) return { title: 'Un poco desalineados', detail: 'Puede valer la pena charlar cómo se sintió cada uno.', Icon: HeartCrack };
  return { title: 'Bastante desalineados', detail: 'Vivieron la semana muy distinto — dedicarle un rato a hablarlo puede ayudar.', Icon: HeartCrack };
}

// Construye tramos continuos de puntos (corta el trazo donde falta un dato)
function buildSegments(points) {
  const segments = [];
  let current = [];
  points.forEach((p) => {
    if (p === null) {
      if (current.length > 1) segments.push(current);
      current = [];
    } else {
      current.push(p);
    }
  });
  if (current.length > 1) segments.push(current);
  return segments;
}

const CHART_WIDTH = 280;
const CHART_HEIGHT = 90;
const CHART_PAD_Y = 12;

function scoreToY(score) {
  // score 1..5 -> y invertido dentro del área del gráfico
  return CHART_HEIGHT - CHART_PAD_Y - ((score - 1) / 4) * (CHART_HEIGHT - CHART_PAD_Y * 2);
}

export default function CheckinPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const weekStart = getWeekStart();
  const partnerName = currentUser ? getPartnerName(currentUser) : null;

  // El chequeo se responde los miércoles. Si se pasó el miércoles y todavía
  // no respondiste esta semana, se habilita como "recuperatorio" el resto
  // de la semana. Lunes/martes quedan bloqueados para no adelantarse.
  const dayIndex = (new Date().getDay() + 6) % 7; // Lunes=0 ... Domingo=6
  const isWednesday = dayIndex === 2;

  const loadCheckins = useCallback(async () => {
    const { data, error } = await supabase
      .from('weekly_checkins')
      .select('*')
      .order('week_start', { ascending: false });
    if (error) {
      console.error('Error cargando chequeos semanales:', error);
      return;
    }
    setCheckins(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      setCurrentUser(session.user.app_metadata?.display_name || null);
      await loadCheckins();
      setLoading(false);
    })();
  }, [router, loadCheckins]);

  useEffect(() => {
    const channel = supabase
      .channel('weekly-checkins-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_checkins' }, () => {
        loadCheckins();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [loadCheckins]);

  const myCheckinThisWeek = checkins.find((c) => c.user_name === currentUser && c.week_start === weekStart);
  const partnerCheckinThisWeek = partnerName
    ? checkins.find((c) => c.user_name === partnerName && c.week_start === weekStart)
    : null;

  const canAnswer = isWednesday || (dayIndex > 2 && !myCheckinThisWeek);

  useEffect(() => {
    if (myCheckinThisWeek) {
      setSelectedMood(myCheckinThisWeek.mood);
      setComment(myCheckinThisWeek.comment || '');
    }
  }, [myCheckinThisWeek?.mood, myCheckinThisWeek?.comment]);

  async function submitCheckin() {
    if (!selectedMood || !currentUser) return;
    setSaving(true);
    const { error } = await supabase.from('weekly_checkins').upsert({
      user_name: currentUser,
      week_start: weekStart,
      mood: selectedMood,
      comment: comment.trim() || null,
    });
    setSaving(false);
    if (error) {
      console.error('Error guardando chequeo semanal:', error);
      return;
    }
    await loadCheckins();
  }

  // Agrupar por semana para la tendencia
  const weekMap = useMemo(() => {
    const map = {};
    checkins.forEach((c) => {
      if (!map[c.week_start]) map[c.week_start] = {};
      map[c.week_start][c.user_name] = c;
    });
    return map;
  }, [checkins]);

  const orderedWeeks = useMemo(
    () => Object.keys(weekMap).sort((a, b) => (a < b ? 1 : -1)),
    [weekMap]
  );

  const { streak, currentComplete } = useMemo(
    () => (currentUser && partnerName ? computeStreak(weekMap, currentUser, partnerName) : { streak: 0, currentComplete: false }),
    [weekMap, currentUser, partnerName]
  );

  const myMoodDef = getCheckinMood(myCheckinThisWeek?.mood);
  const partnerMoodDef = getCheckinMood(partnerCheckinThisWeek?.mood);
  const bothAnsweredThisWeek = !!myMoodDef && !!partnerMoodDef;
  const scoreDiff = bothAnsweredThisWeek ? Math.abs(myMoodDef.score - partnerMoodDef.score) : null;
  const syncInfo = scoreDiff !== null ? getSyncMessage(scoreDiff) : null;

  // Datos del gráfico: últimas 8 semanas con datos, de más vieja a más nueva
  const chartWeeks = useMemo(() => orderedWeeks.slice(0, 8).slice().reverse(), [orderedWeeks]);

  const chart = useMemo(() => {
    if (!currentUser || !partnerName || chartWeeks.length < 2) return null;

    const n = chartWeeks.length;
    const xs = chartWeeks.map((_, i) => (n === 1 ? CHART_WIDTH / 2 : (i / (n - 1)) * CHART_WIDTH));

    const myPoints = chartWeeks.map((week, i) => {
      const entry = weekMap[week]?.[currentUser];
      const def = entry ? getCheckinMood(entry.mood) : null;
      return def ? [xs[i], scoreToY(def.score)] : null;
    });
    const partnerPoints = chartWeeks.map((week, i) => {
      const entry = weekMap[week]?.[partnerName];
      const def = entry ? getCheckinMood(entry.mood) : null;
      return def ? [xs[i], scoreToY(def.score)] : null;
    });

    return {
      xs,
      mySegments: buildSegments(myPoints),
      partnerSegments: buildSegments(partnerPoints),
      myDots: myPoints.filter(Boolean),
      partnerDots: partnerPoints.filter(Boolean),
    };
  }, [chartWeeks, weekMap, currentUser, partnerName]);

  if (loading || !currentUser) return null;

  return (
    <div className="checkin-container">
      <header className="checkin-header">
        <button className="icon-only-btn" onClick={() => router.push('/menu')} title="Volver">
          <ArrowLeft size={20} />
        </button>
        <div className="checkin-title-header inline-icon-text">
          Chequeo semanal <CalendarCheck size={18} />
        </div>
        <div style={{ width: 32 }} />
      </header>

      <div className="checkin-body">
        <div className="checkin-wallpaper" aria-hidden="true">
          {WALLPAPER_POSITIONS.map((p, i) => {
            const WIcon = WALLPAPER_ICONS[i % WALLPAPER_ICONS.length];
            return (
              <WIcon
                key={i}
                size={p.size}
                strokeWidth={1.75}
                className="checkin-wallpaper-icon"
                style={{ top: p.top, left: p.left, transform: `rotate(${p.rotate}deg)` }}
              />
            );
          })}
        </div>

        <div className="checkin-scroll-inner">
          {streak > 0 && (
            <div className="checkin-streak-banner">
              <Flame size={20} className="checkin-streak-flame" />
              <span>
                <strong>{streak}</strong> semana{streak === 1 ? '' : 's'} seguida{streak === 1 ? '' : 's'} respondiendo los dos
                {!currentComplete && ' — respondé esta semana para seguir la racha'}
              </span>
            </div>
          )}

          <div className="checkin-card" style={{ '--mood-color': getCheckinMood(selectedMood)?.color || '#9b3fa0' }}>
            <h3>¿Cómo estamos como pareja esta semana?</h3>
            <p className="checkin-week-label">Semana del {formatWeekLabel(weekStart)}</p>

            {canAnswer ? (
              <>
                <div className="mood-hero" style={{ '--mood-color': getCheckinMood(selectedMood)?.color || '#9b3fa0' }}>
                  <div key={selectedMood || 'none'} className="mood-hero-icon">
                    {(() => {
                      const m = getCheckinMood(selectedMood);
                      return m ? <m.Icon size={28} strokeWidth={2.2} /> : <Calendar size={26} strokeWidth={2.2} />;
                    })()}
                  </div>
                  <span key={`${selectedMood}-label`} className="mood-hero-label">
                    {getCheckinMood(selectedMood)?.text || 'Elegí cómo vienen'}
                  </span>
                  <span key={`${selectedMood}-underline`} className="mood-hero-underline" />
                </div>

                <div className="mood-strip">
                  {CHECKIN_MOODS.map((m) => (
                    <button
                      key={m.key}
                      className={`mood-strip-btn ${selectedMood === m.key ? 'selected' : ''}`}
                      onClick={() => setSelectedMood(m.key)}
                      title={m.text}
                      style={{ '--mood-color': m.color }}
                    >
                      <m.Icon size={19} strokeWidth={2.5} />
                    </button>
                  ))}
                </div>

                <textarea
                  className="checkin-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comentario opcional... (¿qué estuvo bien? ¿qué mejorarías?)"
                  rows={3}
                />

                <button
                  className="checkin-submit-btn"
                  onClick={submitCheckin}
                  disabled={!selectedMood || saving}
                >
                  {myCheckinThisWeek ? 'Actualizar respuesta' : 'Enviar respuesta'}
                </button>

                <p className="checkin-partner-status">
                  {partnerCheckinThisWeek ? (
                    <span className="inline-icon-text">{partnerName} ya respondió esta semana <CircleCheck size={14} /></span>
                  ) : (
                    `${partnerName} todavía no respondió esta semana`
                  )}
                </p>
              </>
            ) : (
              <div className="checkin-locked">
                <div className="mood-hero" style={{ '--mood-color': myMoodDef?.color || '#9b3fa0' }}>
                  <div className="mood-hero-icon">
                    {myMoodDef ? <myMoodDef.Icon size={28} strokeWidth={2.2} /> : <Calendar size={26} strokeWidth={2.2} />}
                  </div>
                  <span className="mood-hero-label">{myMoodDef ? myMoodDef.text : 'Todavía sin responder'}</span>
                  <span className="mood-hero-underline" />
                </div>

                {myCheckinThisWeek?.comment && (
                  <p className="checkin-locked-comment">“{myCheckinThisWeek.comment}”</p>
                )}

                <p className="checkin-locked-note inline-icon-text">
                  <Calendar size={14} />
                  {myCheckinThisWeek
                    ? 'Ya respondiste esta semana — el próximo chequeo se habilita el miércoles.'
                    : 'Este chequeo se responde los miércoles. Volvé ese día para contarnos cómo vienen.'}
                </p>

                <p className="checkin-partner-status">
                  {partnerCheckinThisWeek ? (
                    <span className="inline-icon-text">{partnerName} ya respondió esta semana <CircleCheck size={14} /></span>
                  ) : (
                    `${partnerName} todavía no respondió esta semana`
                  )}
                </p>
              </div>
            )}
          </div>

          {syncInfo && (
            <div className={`checkin-sync-card sync-diff-${scoreDiff}`}>
              <syncInfo.Icon size={26} className="checkin-sync-icon" />
              <div className="checkin-sync-text">
                <div className="checkin-sync-title">{syncInfo.title}</div>
                <div className="checkin-sync-detail">{syncInfo.detail}</div>
              </div>
            </div>
          )}

          <div className="checkin-trend">
            <h3>Tendencia</h3>

            {orderedWeeks.length === 0 && (
              <p className="checkin-empty">Todavía no hay chequeos. ¡Esta puede ser la primera semana!</p>
            )}

            {chart && (
              <div className="checkin-chart-wrap">
                <svg
                  className="checkin-chart"
                  viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                  preserveAspectRatio="none"
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <line
                      key={s}
                      x1={0}
                      x2={CHART_WIDTH}
                      y1={scoreToY(s)}
                      y2={scoreToY(s)}
                      className="checkin-chart-gridline"
                    />
                  ))}

                  {chart.partnerSegments.map((seg, i) => (
                    <polyline
                      key={`p-${i}`}
                      points={seg.map(([x, y]) => `${x},${y}`).join(' ')}
                      className="checkin-chart-line partner"
                    />
                  ))}
                  {chart.partnerDots.map(([x, y], i) => (
                    <circle key={`pd-${i}`} cx={x} cy={y} r={3} className="checkin-chart-dot partner" />
                  ))}

                  {chart.mySegments.map((seg, i) => (
                    <polyline
                      key={`m-${i}`}
                      points={seg.map(([x, y]) => `${x},${y}`).join(' ')}
                      className="checkin-chart-line me"
                    />
                  ))}
                  {chart.myDots.map(([x, y], i) => (
                    <circle key={`md-${i}`} cx={x} cy={y} r={3} className="checkin-chart-dot me" />
                  ))}
                </svg>

                <div className="checkin-chart-legend">
                  <span className="checkin-legend-item"><span className="checkin-legend-dot me" /> Vos</span>
                  <span className="checkin-legend-item"><span className="checkin-legend-dot partner" /> {partnerName}</span>
                </div>
              </div>
            )}

            {orderedWeeks.map((week) => {
              const entries = weekMap[week];
              return (
                <div key={week} className="checkin-week-row">
                  <div className="checkin-week-row-label">{formatWeekLabel(week)}</div>
                  <div className="checkin-week-row-entries">
                    {[currentUser, partnerName].map((name) => {
                      const entry = entries[name];
                      return (
                        <div key={name} className="checkin-week-entry">
                          <span className="checkin-week-entry-name">{name === currentUser ? 'Vos' : name}</span>
                          <span className="checkin-week-entry-mood">
                            {entry ? (() => { const m = getCheckinMood(entry.mood); return m ? <m.Icon size={16} style={{ color: m.color }} /> : entry.mood; })() : '—'}
                          </span>
                          {entry?.comment && <span className="checkin-week-entry-comment">{entry.comment}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
