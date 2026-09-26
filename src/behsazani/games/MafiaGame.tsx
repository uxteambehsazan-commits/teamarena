import { useState, useEffect, useRef, useCallback } from 'react'
import type { BehsazaniPlayer } from '../BehsazaniHub'
import { supabase } from '../../lib/supabase'
import { usePrivateChannel } from '../../lib/multiplayer/usePrivateChannel'

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'citizen' | 'shadow' | 'don' | 'detective' | 'doctor'
type Phase =
  | 'waiting_role'
  | 'role_reveal'
  | 'night'
  | 'morning'
  | 'day'
  | 'voting'
  | 'tie_revote'
  | 'elimination'
  | 'result'

const ROLES: Record<Role, { label: string; emoji: string; color: string; team: 'org' | 'shadow'; desc: string }> = {
  citizen:   { label: 'همکار',               emoji: '🏢', color: '#22c55e', team: 'org',    desc: 'امشب مأموریت ویژه‌ای نداری. سرنخ‌ها را جمع کن.' },
  shadow:    { label: 'عضو تیم سایه',        emoji: '🕶️', color: '#CC2229', team: 'shadow', desc: 'در شب با تیمت هدف را انتخاب کن.' },
  don:       { label: 'رهبر تیم سایه',       emoji: '🎭', color: '#ef4444', team: 'shadow', desc: 'در شب هدف را انتخاب کن و تحلیلگر را شناسایی کن.' },
  detective: { label: 'تحلیلگر امنیت',       emoji: '🔍', color: '#3b82f6', team: 'org',    desc: 'هر شب یک بازیکن را بررسی کن.' },
  doctor:    { label: 'مسئول تداوم خدمت',    emoji: '🛡️', color: '#a855f7', team: 'org',    desc: 'هر شب یک بازیکن را محافظت کن.' },
}

// ─── Role distribution ────────────────────────────────────────────────────────

function buildRoleList(n: number): Role[] {
  const roles: Role[] = ['don']
  const shadowCount = n <= 8 ? 1 : n <= 11 ? 2 : 3
  for (let i = 0; i < shadowCount; i++) roles.push('shadow')
  roles.push('detective')
  if (n >= 6) roles.push('doctor')
  while (roles.length < n) roles.push('citizen')
  return roles.sort(() => Math.random() - 0.5)
}

function checkWin(alive: string[], roleMap: Record<string, Role>): 'org' | 'shadow' | null {
  const aliveShadow = alive.filter(id => ROLES[roleMap[id]]?.team === 'shadow').length
  const aliveOrg    = alive.filter(id => ROLES[roleMap[id]]?.team === 'org').length
  if (aliveShadow === 0) return 'org'
  if (aliveShadow >= aliveOrg) return 'shadow'
  return null
}

// ─── Public state (broadcast to everyone) ────────────────────────────────────

interface PubState {
  phase: Phase
  day: number
  alive: string[]           // player IDs
  players: { id: string; name: string }[]
  morningMsg: string | null  // what happened last night
  votes: Record<string, string>   // voterId → targetId
  tieCandidates: string[] | null
  revoteVotes: Record<string, string>
  eliminatedId: string | null
  eliminatedRole: Role | null
  winner: 'org' | 'shadow' | null
  revealedRoles: { id: string; name: string; role: Role; alive: boolean }[] | null
  nightActions: {
    shadowVotes: Record<string, string>  // shadowId → targetId
    detectiveDone: boolean
    doctorDone: boolean
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  players: BehsazaniPlayer[]
  myPlayer: BehsazaniPlayer
  isHost: boolean
  isOnline: boolean
  roomCode?: string
  hostPlayerId?: string
  onExit: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function plural(n: number, w: string) { return `${n} ${w}` }

function PlayerBtn({ player, onClick, disabled, accent = '#CC2229', selected = false }: {
  player: { id: string; name: string }; onClick: () => void
  disabled?: boolean; accent?: string; selected?: boolean
}) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="btn-game flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-white w-full"
      style={{
        background: selected ? `${accent}33` : 'rgba(26,26,28,0.9)',
        border: `1.5px solid ${selected ? accent : 'rgba(255,255,255,0.1)'}`,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 20 }}>👤</span>
      <span className="flex-1 text-right">{player.name}</span>
      {selected && <span style={{ fontSize: 12, color: accent }}>✓</span>}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MafiaGame({ players, myPlayer, isHost, roomCode, onExit }: Props) {

  // Per-player private state
  const [myRole, setMyRole]           = useState<Role | null>(null)
  const [myShadowTeam, setMyShadowTeam] = useState<string[]>([])  // names
  const [detectiveResult, setDetectiveResult] = useState<{ name: string; isShadow: boolean } | null>(null)
  const [nightActionSent, setNightActionSent] = useState(false)
  const [myVote, setMyVote]           = useState<string | null>(null)
  const [myRevote, setMyRevote]       = useState<string | null>(null)

  // Public state received from host
  const [pub, setPub]   = useState<PubState | null>(null)
  const [phase, setPhase] = useState<Phase>('waiting_role')
  const [connected, setConnected] = useState<'connecting' | 'connected' | 'error'>('connecting')

  // Host-only state (role assignments)
  const roleMapRef = useRef<Record<string, Role>>({})
  const nightRef   = useRef<{ shadowVotes: Record<string, string>; doctorSave?: string; detectiveTarget?: string }>({ shadowVotes: {} })

  // ── Private channel for role delivery + detective results ──────────────────
  const { sendPrivate } = usePrivateChannel(
    roomCode ?? '',
    myPlayer.id,
    useCallback((msg) => {
      if (msg.type === 'mafia_role') {
        const d = msg.data as { role: Role; shadowTeam?: string[] }
        setMyRole(d.role)
        setMyShadowTeam(d.shadowTeam ?? [])
        setPhase('role_reveal')
      }
      if (msg.type === 'detective_result') {
        const d = msg.data as { name: string; isShadow: boolean }
        setDetectiveResult(d)
      }
    }, []),
  )

  // ── Public broadcast channel ───────────────────────────────────────────────
  useEffect(() => {
    if (!roomCode) return
    const ch = supabase.channel(`beh-${roomCode}-mafia-pub`, {
      config: { broadcast: { self: true, ack: false } },
    })
    ch.on('broadcast', { event: 'mafia_pub' }, ({ payload }: any) => {
      if (!payload?.s) return
      const s = payload.s as PubState
      setPub(s)
      setPhase(s.phase)
      setConnected('connected')
    })
    ch.subscribe(status => {
      if (status === 'SUBSCRIBED') setConnected('connected')
      if (status === 'CHANNEL_ERROR') setConnected('error')
    })
    return () => { supabase.removeChannel(ch) }
  }, [roomCode])

  const broadcastPub = useCallback(async (s: PubState) => {
    if (!roomCode) return
    await supabase.channel(`beh-${roomCode}-mafia-pub`).send({
      type: 'broadcast', event: 'mafia_pub', payload: { s },
    }).catch(() => {})
  }, [roomCode])

  // ── Night actions channel (non-host players → host) ───────────────────────
  useEffect(() => {
    if (!isHost || !roomCode) return
    const ch = supabase.channel(`beh-${roomCode}-mafia-night`, {
      config: { broadcast: { self: false, ack: false } },
    })
    ch.on('broadcast', { event: 'night_action' }, ({ payload }: any) => {
      const { type, targetId, fromId } = payload
      if (type === 'shadow_vote') {
        nightRef.current.shadowVotes[fromId] = targetId
      }
      if (type === 'doctor_save') {
        nightRef.current.doctorSave = targetId
      }
      if (type === 'detective_check') {
        nightRef.current.detectiveTarget = targetId
        const role = roleMapRef.current[targetId]
        if (role) {
          sendPrivate(fromId, {
            type: 'detective_result',
            data: { name: players.find(p => p.id === targetId)?.name ?? '', isShadow: ROLES[role].team === 'shadow' },
          })
        }
      }
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, roomCode])

  const sendNightAction = useCallback(async (type: string, targetId: string) => {
    if (!roomCode) return
    const ch = supabase.channel(`beh-${roomCode}-mafia-night`)
    await ch.send({
      type: 'broadcast', event: 'night_action',
      payload: { type, targetId, fromId: myPlayer.id },
    }).catch(() => {})
    setNightActionSent(true)

    // If I'm the host and doing the action myself
    if (isHost) {
      if (type === 'shadow_vote')   nightRef.current.shadowVotes[myPlayer.id] = targetId
      if (type === 'doctor_save')   nightRef.current.doctorSave = targetId
      if (type === 'detective_check') {
        nightRef.current.detectiveTarget = targetId
        const role = roleMapRef.current[targetId]
        if (role) {
          setDetectiveResult({ name: players.find(p => p.id === targetId)?.name ?? '', isShadow: ROLES[role].team === 'shadow' })
        }
      }
    }
  }, [roomCode, myPlayer.id, isHost, players])

  // Voting channel
  const sendVote = useCallback(async (targetId: string, isRevote = false) => {
    if (!pub || !roomCode) return
    const newVotes = isRevote
      ? { ...pub.revoteVotes, [myPlayer.id]: targetId }
      : { ...pub.votes, [myPlayer.id]: targetId }
    await broadcastPub(
      isRevote
        ? { ...pub, revoteVotes: newVotes }
        : { ...pub, votes: newVotes }
    )
    if (isRevote) setMyRevote(targetId); else setMyVote(targetId)
  }, [pub, roomCode, myPlayer.id, broadcastPub])

  // ── Host: assign roles ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isHost || !roomCode) return

    const roleList = buildRoleList(players.length)
    const roleMap: Record<string, Role> = {}
    players.forEach((p, i) => { roleMap[p.id] = roleList[i] })
    roleMapRef.current = roleMap

    const shadowNames = players.filter(p => ROLES[roleMap[p.id]].team === 'shadow').map(p => p.name)

    async function assignRoles() {
      for (const p of players) {
        const role = roleMap[p.id]
        const isShadow = ROLES[role].team === 'shadow'
        await sendPrivate(p.id, {
          type: 'mafia_role',
          data: { role, shadowTeam: isShadow ? shadowNames.filter(n => n !== p.name) : undefined },
        })
      }
      const initPub: PubState = {
        phase: 'night',
        day: 1,
        alive: players.map(p => p.id),
        players: players.map(p => ({ id: p.id, name: p.name })),
        morningMsg: null,
        votes: {},
        tieCandidates: null,
        revoteVotes: {},
        eliminatedId: null,
        eliminatedRole: null,
        winner: null,
        revealedRoles: null,
        nightActions: { shadowVotes: {}, detectiveDone: false, doctorDone: false },
      }
      await broadcastPub(initPub)
    }
    assignRoles()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, roomCode])

  // ── Host: resolve night ────────────────────────────────────────────────────
  async function resolveNight() {
    if (!pub || !isHost) return
    const { shadowVotes, doctorSave } = nightRef.current

    // Majority shadow vote
    const tally: Record<string, number> = {}
    Object.values(shadowVotes).forEach(id => { tally[id] = (tally[id] ?? 0) + 1 })
    const maxV = Math.max(...Object.values(tally), 0)
    const shadowTarget = maxV > 0 ? (Object.keys(tally).find(id => tally[id] === maxV) ?? null) : null

    let newAlive = [...pub.alive]
    let morningMsg = ''
    if (shadowTarget && shadowTarget !== doctorSave) {
      newAlive = newAlive.filter(id => id !== shadowTarget)
      const name = pub.players.find(p => p.id === shadowTarget)?.name
      morningMsg = `${name} دیگر در جلسه حاضر نیست.`
    } else if (shadowTarget && shadowTarget === doctorSave) {
      morningMsg = 'دیشب یک رویداد مشکوک رخ داد، اما خدمات ادامه دارد.'
    } else {
      morningMsg = 'یک شب آرام گذشت. همه در جلسه حاضرند.'
    }

    nightRef.current = { shadowVotes: {} }
    const win = checkWin(newAlive, roleMapRef.current)
    const newPub: PubState = {
      ...pub,
      phase: win ? 'result' : 'morning',
      day: pub.day,
      alive: newAlive,
      morningMsg,
      winner: win,
      votes: {},
      tieCandidates: null,
      revoteVotes: {},
      nightActions: { shadowVotes: {}, detectiveDone: false, doctorDone: false },
      revealedRoles: win
        ? pub.players.map(p => ({
            id: p.id, name: p.name, role: roleMapRef.current[p.id], alive: newAlive.includes(p.id),
          }))
        : null,
    }
    await broadcastPub(newPub)
  }

  // ── Host: start day discussion ─────────────────────────────────────────────
  async function startDay() {
    if (!pub || !isHost) return
    await broadcastPub({ ...pub, phase: 'day' })
  }

  // ── Host: start voting ─────────────────────────────────────────────────────
  async function startVoting() {
    if (!pub || !isHost) return
    await broadcastPub({ ...pub, phase: 'voting', votes: {}, tieCandidates: null, revoteVotes: {} })
    setMyVote(null)
    setMyRevote(null)
  }

  // ── Host: resolve voting ───────────────────────────────────────────────────
  async function resolveVoting(voteMap: Record<string, string>, isTieRevote: boolean) {
    if (!pub || !isHost) return
    const tally: Record<string, number> = {}
    Object.values(voteMap).forEach(id => { tally[id] = (tally[id] ?? 0) + 1 })
    const maxV = Math.max(...Object.values(tally), 0)
    const topIds = Object.keys(tally).filter(id => tally[id] === maxV)

    if (topIds.length > 1 && !isTieRevote) {
      // Tie → revote between tied candidates
      await broadcastPub({ ...pub, phase: 'tie_revote', tieCandidates: topIds, revoteVotes: {} })
      setMyRevote(null)
      return
    }

    // Eliminate top or no one if tie persists
    const elimId = topIds.length === 1 ? topIds[0] : null
    const elimRole = elimId ? roleMapRef.current[elimId] : null
    const newAlive = elimId ? pub.alive.filter(id => id !== elimId) : [...pub.alive]
    const win = checkWin(newAlive, roleMapRef.current)
    await broadcastPub({
      ...pub,
      phase: win ? 'result' : (elimId ? 'elimination' : 'day'),
      alive: newAlive,
      eliminatedId: elimId,
      eliminatedRole: elimRole ?? null,
      winner: win,
      votes: {},
      revoteVotes: {},
      tieCandidates: null,
      revealedRoles: win
        ? pub.players.map(p => ({
            id: p.id, name: p.name, role: roleMapRef.current[p.id], alive: newAlive.includes(p.id),
          }))
        : null,
    })
  }

  // ── Host: next night ───────────────────────────────────────────────────────
  async function nextNight() {
    if (!pub || !isHost) return
    nightRef.current = { shadowVotes: {} }
    await broadcastPub({
      ...pub,
      phase: 'night',
      day: pub.day + 1,
      morningMsg: null,
      eliminatedId: null,
      eliminatedRole: null,
      votes: {},
      revoteVotes: {},
      tieCandidates: null,
      nightActions: { shadowVotes: {}, detectiveDone: false, doctorDone: false },
    })
    setNightActionSent(false)
    setDetectiveResult(null)
    setMyVote(null)
    setMyRevote(null)
  }

  // ─── UI ──────────────────────────────────────────────────────────────────────

  const myRoleInfo  = myRole ? ROLES[myRole] : null
  const iAmAlive    = pub ? pub.alive.includes(myPlayer.id) : true
  const isShadow    = myRole === 'shadow' || myRole === 'don'
  const isDon       = myRole === 'don'
  const isDetective = myRole === 'detective'
  const isDoctor    = myRole === 'doctor'

  // Connection badge
  const ConnBadge = () => (
    <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-xs font-bold z-20"
      style={{
        background: connected === 'connected' ? 'rgba(34,197,94,0.15)' : connected === 'error' ? 'rgba(204,34,41,0.15)' : 'rgba(255,214,10,0.15)',
        color:      connected === 'connected' ? '#22c55e'              : connected === 'error' ? '#CC2229'              : '#ffd60a',
        border: `1px solid ${connected === 'connected' ? '#22c55e44' : connected === 'error' ? '#CC222944' : '#ffd60a44'}`,
      }}>
      {connected === 'connected' ? '🟢 متصل' : connected === 'error' ? '🔴 خطا' : '🟡 اتصال...'}
    </div>
  )

  // Role badge (always visible at top when role known)
  const RoleBadge = () => myRoleInfo ? (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" dir="rtl"
      style={{ background: `${myRoleInfo.color}18`, border: `1px solid ${myRoleInfo.color}44` }}>
      <span style={{ fontSize: 14 }}>{myRoleInfo.emoji}</span>
      <span className="text-xs font-black" style={{ color: myRoleInfo.color }}>{myRoleInfo.label}</span>
    </div>
  ) : null

  // ── Phase: waiting_role ───────────────────────────────────────────────────
  if (phase === 'waiting_role') return (
    <div className="h-full flex flex-col items-center justify-center gap-5 relative" dir="rtl"
      style={{ background: 'linear-gradient(160deg,#0e0e0f,#16101a,#0e1214)' }}>
      <ConnBadge />
      <div className="text-5xl" style={{ animation: 'spin 2s linear infinite' }}>🎭</div>
      <p className="font-black text-white text-xl">در حال دریافت نقش...</p>
      <p className="text-sm" style={{ color: '#9a9b9e' }}>میزبان در حال تعیین نقش‌هاست</p>
      <button onClick={onExit} className="btn-game px-5 py-2 rounded-xl text-sm font-bold mt-4"
        style={{ background: 'rgba(255,255,255,0.06)', color: '#9a9b9e' }}>انصراف</button>
    </div>
  )

  // ── Phase: role_reveal ────────────────────────────────────────────────────
  if (phase === 'role_reveal' && myRoleInfo) return (
    <div className="h-full overflow-y-auto" dir="rtl">
    <div className="min-h-full flex flex-col items-center justify-center gap-5 px-6 py-8 relative"
      style={{ background: 'linear-gradient(160deg,#0e0e0f,#16101a,#0e1214)' }}>
      <ConnBadge />
      <p className="font-black text-white text-lg">{myPlayer.name}، نقش شما:</p>
      <div className="w-52 h-52 rounded-3xl flex flex-col items-center justify-center gap-3 border-2"
        style={{ background: `${myRoleInfo.color}18`, borderColor: myRoleInfo.color, boxShadow: `0 0 40px ${myRoleInfo.color}44` }}>
        <span style={{ fontSize: 56 }}>{myRoleInfo.emoji}</span>
        <span className="font-black text-2xl" style={{ color: myRoleInfo.color }}>{myRoleInfo.label}</span>
        <span className="text-xs font-bold px-3 py-0.5 rounded-full"
          style={{ background: myRoleInfo.team === 'org' ? '#22c55e22' : '#CC222922', color: myRoleInfo.team === 'org' ? '#22c55e' : '#CC2229' }}>
          {myRoleInfo.team === 'org' ? 'تیم سازمان' : 'تیم سایه'}
        </span>
      </div>
      <p className="text-sm text-center max-w-xs" style={{ color: '#9a9b9e' }}>{myRoleInfo.desc}</p>
      {isShadow && myShadowTeam.length > 0 && (
        <div className="px-5 py-3 rounded-2xl text-center"
          style={{ background: 'rgba(204,34,41,0.12)', border: '1.5px solid rgba(204,34,41,0.3)' }}>
          <p className="text-xs font-black mb-1" style={{ color: '#CC2229' }}>اعضای تیم سایه:</p>
          <p className="text-sm font-bold text-white">{myShadowTeam.join('  •  ')}</p>
        </div>
      )}
      <p className="text-xs text-center" style={{ color: '#6D6E71' }}>این اطلاعات فقط برای شماست — به دیگران نشان ندهید</p>
      <button onClick={() => { if (pub) setPhase(pub.phase); else if (isHost) setPhase('night') }}
        className="btn-game w-full max-w-xs py-4 rounded-2xl font-black text-lg text-white"
        style={{ background: `linear-gradient(135deg,${myRoleInfo.color},${myRoleInfo.color}bb)` }}>
        متوجه شدم — شروع بازی
      </button>
    </div>
    </div>
  )

  // ── Waiting for pub ───────────────────────────────────────────────────────
  if (!pub) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 relative" dir="rtl"
      style={{ background: 'linear-gradient(160deg,#0e0e0f,#16101a)' }}>
      <ConnBadge />
      <div className="text-4xl" style={{ animation: 'pulse 1.2s ease-in-out infinite' }}>⏳</div>
      <p className="font-black text-white">در حال همگام‌سازی...</p>
    </div>
  )

  const alivePlayers = pub.players.filter(p => pub.alive.includes(p.id))
  const myVoted = pub.votes[myPlayer.id]
  const myRevoted = pub.revoteVotes?.[myPlayer.id]

  // ── Phase: night ──────────────────────────────────────────────────────────
  if (pub.phase === 'night') {
    const nightTargets = alivePlayers.filter(p =>
      isShadow ? ROLES[roleMapRef.current[p.id] ?? 'citizen']?.team !== 'shadow' : p.id !== myPlayer.id
    )

    return (
      <div className="h-full overflow-y-auto" dir="rtl">
      <div className="min-h-full flex flex-col items-center justify-center gap-5 px-5 py-6 relative"
        style={{ background: 'linear-gradient(160deg,#050510,#0a0a18,#050514)' }}>
        <ConnBadge />

        <div className="text-6xl" style={{ filter: 'drop-shadow(0 0 24px #3b82f6)' }}>🌙</div>
        <div className="text-center">
          <h2 className="font-black text-white text-2xl">شب {pub.day}</h2>
          <p className="text-xs mt-1" style={{ color: '#9a9b9e' }}>سازمان در حال بررسی یک رخداد مشکوک است</p>
        </div>

        {/* Role indicator */}
        <RoleBadge />

        {/* Spectator msg */}
        {!iAmAlive && (
          <div className="px-5 py-3 rounded-2xl text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-sm font-bold" style={{ color: '#9a9b9e' }}>شما از بازی خارج شده‌اید. تماشاگر هستید.</p>
          </div>
        )}

        {/* Actions */}
        {iAmAlive && !nightActionSent && (
          <div className="w-full max-w-xs flex flex-col gap-2">
            {isShadow && (
              <>
                <p className="text-xs font-black text-center" style={{ color: '#CC2229' }}>
                  {isDon ? 'رهبر تیم سایه — هدف را انتخاب کن:' : 'عضو تیم سایه — هدف پیشنهادی:'}
                </p>
                {nightTargets.map(p => (
                  <PlayerBtn key={p.id} player={p} accent="#CC2229"
                    onClick={() => sendNightAction('shadow_vote', p.id)} />
                ))}
              </>
            )}
            {isDetective && (
              <>
                <p className="text-xs font-black text-center" style={{ color: '#3b82f6' }}>تحلیلگر امنیت — بررسی کن:</p>
                {alivePlayers.filter(p => p.id !== myPlayer.id).map(p => (
                  <PlayerBtn key={p.id} player={p} accent="#3b82f6"
                    onClick={() => sendNightAction('detective_check', p.id)} />
                ))}
              </>
            )}
            {isDoctor && (
              <>
                <p className="text-xs font-black text-center" style={{ color: '#a855f7' }}>مسئول تداوم خدمت — محافظت کن:</p>
                {alivePlayers.map(p => (
                  <PlayerBtn key={p.id} player={p} accent="#a855f7"
                    onClick={() => sendNightAction('doctor_save', p.id)} />
                ))}
              </>
            )}
            {!isShadow && !isDetective && !isDoctor && (
              <div className="px-5 py-4 rounded-2xl text-center"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-sm font-bold" style={{ color: '#22c55e' }}>امشب مأموریت ویژه‌ای نداری.</p>
                <p className="text-xs mt-1" style={{ color: '#9a9b9e' }}>صبر کن تا شب تمام شود.</p>
              </div>
            )}
          </div>
        )}

        {nightActionSent && iAmAlive && !isDetective && (
          <div className="px-5 py-3 rounded-2xl text-center"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid #22c55e33' }}>
            <p className="text-sm font-bold" style={{ color: '#22c55e' }}>✓ اقدام شما ثبت شد — منتظر بمانید</p>
          </div>
        )}

        {/* Detective result */}
        {isDetective && detectiveResult && (
          <div className="px-5 py-4 rounded-2xl text-center w-full max-w-xs"
            style={{ background: 'rgba(59,130,246,0.12)', border: '1.5px solid #3b82f644' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#9a9b9e' }}>نتیجه بررسی:</p>
            <p className="font-black text-white">{detectiveResult.name}</p>
            <p className="font-bold text-sm mt-1"
              style={{ color: detectiveResult.isShadow ? '#CC2229' : '#22c55e' }}>
              {detectiveResult.isShadow ? '⚠️ عضو تیم سایه است' : '✓ عضو تیم سازمان است'}
            </p>
          </div>
        )}

        {/* Host controls */}
        {isHost && (
          <button onClick={resolveNight}
            className="btn-game w-full max-w-xs py-4 rounded-2xl font-black text-white mt-2"
            style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
            ☀️ صبح شد — اعلام نتیجه
          </button>
        )}
        {!isHost && (
          <p className="text-xs" style={{ color: '#6D6E71' }}>میزبان صبح را اعلام می‌کند...</p>
        )}
      </div>
      </div>
    )
  }

  // ── Phase: morning ────────────────────────────────────────────────────────
  if (pub.phase === 'morning') return (
    <div className="h-full flex flex-col items-center justify-center gap-5 px-6 relative" dir="rtl"
      style={{ background: 'linear-gradient(160deg,#0e0e0f,#181618)' }}>
      <ConnBadge />
      <div className="text-6xl">🌅</div>
      <h2 className="font-black text-white text-2xl text-center">صبح روز {pub.day}</h2>
      <div className="px-5 py-4 rounded-2xl text-center w-full max-w-sm"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p className="text-sm leading-relaxed text-white font-bold">{pub.morningMsg}</p>
      </div>
      <p className="text-xs" style={{ color: '#9a9b9e' }}>بازیکنان زنده: {plural(pub.alive.length, 'نفر')}</p>
      <RoleBadge />
      {isHost && (
        <button onClick={startDay}
          className="btn-game w-full max-w-xs py-4 rounded-2xl font-black text-white"
          style={{ background: 'linear-gradient(135deg,#CC2229,#9e1a20)' }}>
          🗣️ شروع جلسه روز
        </button>
      )}
      {!isHost && <p className="text-xs" style={{ color: '#6D6E71' }}>میزبان جلسه را شروع می‌کند...</p>}
    </div>
  )

  // ── Phase: day ────────────────────────────────────────────────────────────
  if (pub.phase === 'day') return (
    <div className="h-full flex flex-col relative" dir="rtl"
      style={{ background: 'linear-gradient(160deg,#0e0e0f,#181618)' }}>
      <ConnBadge />

      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-10 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-white text-lg">☀️ جلسه روز {pub.day}</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9a9b9e' }}>
              زنده: {pub.alive.length} نفر
            </p>
          </div>
          <RoleBadge />
        </div>
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        <p className="text-xs font-black mb-1" style={{ color: '#9a9b9e' }}>بازیکنان زنده:</p>
        {alivePlayers.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
            style={{ background: 'rgba(26,26,28,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 18 }}>👤</span>
            <span className="flex-1 font-bold text-white text-sm">{p.name}</span>
            {p.id === myPlayer.id && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>شما</span>
            )}
          </div>
        ))}
        {pub.players.filter(p => !pub.alive.includes(p.id)).map(p => (
          <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl opacity-40"
            style={{ background: 'rgba(26,26,28,0.5)', border: '1px dashed rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 18 }}>⚫</span>
            <span className="flex-1 font-bold text-sm" style={{ color: '#6D6E71' }}>{p.name}</span>
            <span className="text-xs" style={{ color: '#6D6E71' }}>حذف‌شده</span>
          </div>
        ))}
      </div>

      {/* Host voting button */}
      {isHost && (
        <div className="flex-shrink-0 px-4 pb-5 pt-2">
          <button onClick={startVoting}
            className="btn-game w-full py-4 rounded-2xl font-black text-white"
            style={{ background: 'linear-gradient(135deg,#CC2229,#9e1a20)', boxShadow: '0 4px 20px rgba(204,34,41,0.4)' }}>
            🗳️ شروع رأی‌گیری
          </button>
        </div>
      )}
      {!isHost && (
        <p className="text-xs text-center pb-4" style={{ color: '#6D6E71' }}>میزبان رأی‌گیری را شروع می‌کند</p>
      )}
    </div>
  )

  // ── Phase: voting / tie_revote ────────────────────────────────────────────
  if (pub.phase === 'voting' || pub.phase === 'tie_revote') {
    const isTie = pub.phase === 'tie_revote'
    const currentVoteMap = isTie ? pub.revoteVotes : pub.votes
    const alreadyVoted = currentVoteMap[myPlayer.id]
    const voteCount = Object.keys(currentVoteMap).length
    const allVoted = voteCount >= pub.alive.length
    const candidates = isTie && pub.tieCandidates ? pub.players.filter(p => pub.tieCandidates!.includes(p.id)) : alivePlayers

    // After all voted — show results (host can resolve)
    if (allVoted) {
      const tally: Record<string, number> = {}
      Object.values(currentVoteMap).forEach(id => { tally[id] = (tally[id] ?? 0) + 1 })
      const maxV = Math.max(...Object.values(tally), 0)
      const topIds = Object.keys(tally).filter(id => tally[id] === maxV)
      const isTieResult = topIds.length > 1 && !isTie

      return (
        <div className="h-full overflow-y-auto" dir="rtl">
        <div className="min-h-full flex flex-col items-center justify-center gap-5 px-5 py-8 relative"
          style={{ background: 'linear-gradient(160deg,#0e0e0f,#181618)' }}>
          <ConnBadge />
          <div className="text-5xl">📊</div>
          <h2 className="font-black text-white text-xl">نتیجه رأی‌گیری</h2>
          <div className="w-full max-w-xs flex flex-col gap-2">
            {alivePlayers.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5 rounded-2xl"
                style={{ background: 'rgba(26,26,28,0.9)', border: `1.5px solid ${topIds.includes(p.id) && maxV > 0 ? '#CC222966' : 'rgba(255,255,255,0.06)'}` }}>
                <span className="font-bold text-white text-sm">{p.name}</span>
                <span className="font-black text-sm" style={{ color: '#CC2229' }}>{tally[p.id] ?? 0} رأی</span>
              </div>
            ))}
          </div>
          {isTieResult
            ? <p className="font-black text-center" style={{ color: '#ffd60a' }}>⚖️ تساوی! رأی‌گیری مجدد بین کاندیداها</p>
            : topIds.length === 1
            ? <p className="font-black text-center text-lg" style={{ color: '#CC2229' }}>
                {pub.players.find(p => p.id === topIds[0])?.name} متهم است
              </p>
            : <p className="font-black text-center" style={{ color: '#ffd60a' }}>⚖️ تساوی — کسی حذف نشد</p>
          }
          {isHost && (
            <button onClick={() => resolveVoting(currentVoteMap, isTie)}
              className="btn-game w-full max-w-xs py-4 rounded-2xl font-black text-white"
              style={{ background: 'linear-gradient(135deg,#CC2229,#9e1a20)' }}>
              {isTieResult ? '🔁 رأی‌گیری مجدد' : topIds.length === 1 ? `حذف ${pub.players.find(p => p.id === topIds[0])?.name}` : 'ادامه بازی'}
            </button>
          )}
          {!isHost && <p className="text-xs" style={{ color: '#6D6E71' }}>منتظر تصمیم میزبان...</p>}
        </div>
        </div>
      )
    }

    // Voting in progress
    if (!iAmAlive) return (
      <div className="h-full flex flex-col items-center justify-center gap-4 relative" dir="rtl"
        style={{ background: 'linear-gradient(160deg,#0e0e0f,#181618)' }}>
        <ConnBadge />
        <div className="text-4xl">🗳️</div>
        <p className="font-black text-white text-lg">{isTie ? 'رأی‌گیری مجدد' : 'رأی‌گیری'}</p>
        <p className="text-sm" style={{ color: '#9a9b9e' }}>{voteCount} از {pub.alive.length} رأی ثبت شده</p>
        <p className="text-xs mt-2" style={{ color: '#6D6E71' }}>شما تماشاگر هستید.</p>
      </div>
    )

    if (alreadyVoted) return (
      <div className="h-full flex flex-col items-center justify-center gap-4 relative" dir="rtl"
        style={{ background: 'linear-gradient(160deg,#0e0e0f,#181618)' }}>
        <ConnBadge />
        <div className="text-5xl">✅</div>
        <p className="font-black text-white text-xl">رأی شما ثبت شد</p>
        <p className="text-sm font-bold" style={{ color: '#ffd60a' }}>
          {voteCount} از {pub.alive.length} نفر رأی داده‌اند
        </p>
        <p className="text-xs mt-2" style={{ color: '#6D6E71' }}>منتظر بقیه...</p>
      </div>
    )

    return (
      <div className="h-full overflow-y-auto" dir="rtl">
      <div className="min-h-full flex flex-col gap-5 px-5 py-8 relative"
        style={{ background: 'linear-gradient(160deg,#0e0e0f,#181618)' }}>
        <ConnBadge />
        <div className="text-center pt-4">
          <div className="text-5xl mb-2">🗳️</div>
          <h2 className="font-black text-white text-xl">
            {isTie ? '⚖️ رأی‌گیری مجدد — تساوی!' : 'رأی خود را بدهید'}
          </h2>
          {isTie && <p className="text-xs mt-1" style={{ color: '#ffd60a' }}>فقط بین کاندیداهای مساوی رأی بدهید</p>}
        </div>
        <RoleBadge />
        <div className="flex flex-col gap-2">
          {candidates.filter(p => p.id !== myPlayer.id).map(p => (
            <PlayerBtn key={p.id} player={p} accent="#CC2229"
              selected={isTie ? myRevote === p.id : myVote === p.id}
              onClick={() => sendVote(p.id, isTie)} />
          ))}
        </div>
        <p className="text-xs text-center" style={{ color: '#6D6E71' }}>
          {voteCount} از {pub.alive.length} نفر رأی داده‌اند
        </p>
      </div>
      </div>
    )
  }

  // ── Phase: elimination ────────────────────────────────────────────────────
  if (pub.phase === 'elimination') {
    const elimName = pub.players.find(p => p.id === pub.eliminatedId)?.name
    const elimRoleInfo = pub.eliminatedRole ? ROLES[pub.eliminatedRole] : null
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 px-6 relative" dir="rtl"
        style={{ background: 'linear-gradient(160deg,#0e0e0f,#181618)' }}>
        <ConnBadge />
        {elimName ? (
          <>
            <div className="text-7xl">📋</div>
            <h2 className="font-black text-white text-2xl text-center">{elimName} از جلسه خارج شد</h2>
            {elimRoleInfo && (
              <div className="px-6 py-4 rounded-2xl text-center"
                style={{ background: `${elimRoleInfo.color}18`, border: `1.5px solid ${elimRoleInfo.color}55` }}>
                <p className="text-3xl">{elimRoleInfo.emoji}</p>
                <p className="font-black text-lg mt-1" style={{ color: elimRoleInfo.color }}>{elimRoleInfo.label}</p>
                <p className="text-xs mt-0.5" style={{ color: elimRoleInfo.team === 'shadow' ? '#CC2229' : '#22c55e' }}>
                  {elimRoleInfo.team === 'shadow' ? 'تیم سایه' : 'تیم سازمان'}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-6xl">⚖️</div>
            <h2 className="font-black text-white text-2xl text-center">در این جلسه کسی حذف نشد</h2>
          </>
        )}
        <RoleBadge />
        {isHost && (
          <button onClick={nextNight}
            className="btn-game w-full max-w-xs py-4 rounded-2xl font-black text-white"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>
            🌙 شروع شب بعدی
          </button>
        )}
        {!isHost && <p className="text-xs" style={{ color: '#6D6E71' }}>میزبان شب بعد را شروع می‌کند...</p>}
      </div>
    )
  }

  // ── Phase: result ─────────────────────────────────────────────────────────
  if (pub.phase === 'result') return (
    <div className="h-full overflow-y-auto" dir="rtl">
    <div className="min-h-full flex flex-col items-center justify-center gap-5 px-5 py-8 relative"
      style={{ background: 'linear-gradient(160deg,#0e0e0f,#181618)' }}>
      <ConnBadge />
      <div className="text-7xl">{pub.winner === 'org' ? '🏆' : '🌑'}</div>
      <h2 className="font-black text-white text-3xl text-center">
        {pub.winner === 'org' ? 'تیم سازمان پیروز شد!' : 'تیم سایه پیروز شد!'}
      </h2>
      {myRoleInfo && (
        <div className="px-5 py-3 rounded-2xl text-center"
          style={{ background: `${myRoleInfo.color}18`, border: `1px solid ${myRoleInfo.color}44` }}>
          <p className="text-xs mb-1" style={{ color: '#9a9b9e' }}>نقش شما:</p>
          <p className="font-black text-lg" style={{ color: myRoleInfo.color }}>{myRoleInfo.emoji} {myRoleInfo.label}</p>
        </div>
      )}
      {pub.revealedRoles && (
        <div className="w-full max-w-sm flex flex-col gap-2">
          <p className="text-xs font-black text-center mb-1" style={{ color: '#9a9b9e' }}>نقش‌های همه بازیکنان:</p>
          {pub.revealedRoles.map(p => {
            const r = ROLES[p.role]
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl"
                style={{ background: 'rgba(26,26,28,0.85)', border: `1px solid ${r.color}33`, opacity: p.alive ? 1 : 0.55 }}>
                <span style={{ fontSize: 18 }}>{r.emoji}</span>
                <span className="flex-1 font-bold text-white text-sm">{p.name}</span>
                <span className="text-xs font-bold" style={{ color: r.color }}>{r.label}</span>
                {!p.alive && <span className="text-xs" style={{ color: '#6D6E71' }}>حذف</span>}
              </div>
            )
          })}
        </div>
      )}
      <button onClick={onExit}
        className="btn-game w-full max-w-xs py-4 rounded-2xl font-black text-white"
        style={{ background: 'rgba(255,255,255,0.09)', border: '1.5px solid rgba(255,255,255,0.18)' }}>
        خروج از بازی
      </button>
    </div>
    </div>
  )

  return null
}
