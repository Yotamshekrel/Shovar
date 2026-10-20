import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { I18nManager, Modal, PanResponder, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Text, successFeedback, tapFeedback, warningFeedback } from '@/components/ui';
import { currencySymbol } from '@/domain/money';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

import { CoinWallet, WALLET_H, WALLET_W, type WalletHit } from './CoinWallet';

const ROUND_MS = 30_000;
const LIVES = 3;
const COIN = 52;
const WALLET_BOTTOM = 28;

type Kind = 'coin' | 'gold' | 'tax';
interface Drop {
  id: number;
  x: number;
  y: number;
  vy: number;
  kind: Kind;
}
type Phase = 'ready' | 'playing' | 'over';

/** Best score for this session; the game is a throwaway easter egg, not worth persisting. */
let sessionBest = 0;

/**
 * Easter egg: "Catch the Coins". Slide the wallet along the bottom to catch the falling coins, the
 * golden ones are worth more, and dodge the tax notices. Thirty seconds, three lives.
 *
 * Positions (`x`, wallet) are physical offsets from the left edge; `place` converts them for RTL.
 */
export function CoinGame({ visible, currency, onClose }: { visible: boolean; currency: string; onClose: () => void }) {
  const { colors, radii } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>('ready');
  // The simulation lives in `drops`; `view` is the snapshot that gets rendered each frame.
  const [view, setView] = useState<Drop[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [best, setBest] = useState(sessionBest);
  const [walletX, setWalletX] = useState(0);
  const [hit, setHit] = useState<WalletHit>({ n: 0, kind: 'good' });

  const drops = useRef<Drop[]>([]);
  const nextId = useRef(1);
  const spawnIn = useRef(0);
  const scoreRef = useRef(0);
  const livesRef = useRef(LIVES);
  const startedAt = useRef(0);
  const walletRef = useRef(0);
  const fieldH = useRef(0);

  const place = (x: number, w: number) => (I18nManager.isRTL ? x - (width - w) : x);
  const moveWallet = useCallback(
    (pageX: number) => {
      setWalletX(Math.max(0, Math.min(width - WALLET_W, pageX - WALLET_W / 2)));
    },
    [width],
  );
  // The game loop reads the wallet position from a ref so it does not restart on every drag.
  useEffect(() => {
    walletRef.current = walletX;
  }, [walletX]);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => moveWallet(e.nativeEvent.pageX),
        onPanResponderMove: (e) => moveWallet(e.nativeEvent.pageX),
      }),
    [moveWallet],
  );

  const finish = useCallback(() => {
    setPhase('over');
    drops.current = [];
    setView([]);
    if (scoreRef.current > sessionBest) {
      sessionBest = scoreRef.current;
      setBest(sessionBest);
      successFeedback();
    }
  }, []);

  const start = () => {
    drops.current = [];
    scoreRef.current = 0;
    livesRef.current = LIVES;
    spawnIn.current = 0;
    startedAt.current = Date.now();
    moveWallet(width / 2);
    setScore(0);
    setLives(LIVES);
    setTimeLeft(ROUND_MS);
    setPhase('playing');
  };

  const close = () => {
    setPhase('ready');
    onClose();
  };

  const collect = useCallback(
    (d: Drop) => {
      setHit((h) => ({ n: h.n + 1, kind: d.kind === 'tax' ? 'tax' : 'good' }));
      if (d.kind === 'tax') {
        warningFeedback();
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) finish();
        return;
      }
      tapFeedback();
      scoreRef.current += d.kind === 'gold' ? 5 : 1;
      setScore(scoreRef.current);
    },
    [finish],
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      const elapsed = now - startedAt.current;
      const left = ROUND_MS - elapsed;
      if (left <= 0) {
        setTimeLeft(0);
        finish();
        return;
      }
      // The longer the round, the faster and denser the rain.
      const pace = 1 + elapsed / ROUND_MS;
      spawnIn.current -= dt;
      if (spawnIn.current <= 0) {
        spawnIn.current = (0.55 + Math.random() * 0.35) / pace;
        const roll = Math.random();
        drops.current.push({
          id: nextId.current++,
          x: Math.random() * (width - COIN),
          y: -COIN,
          vy: (170 + Math.random() * 90) * pace,
          kind: roll < 0.14 ? 'tax' : roll < 0.24 ? 'gold' : 'coin',
        });
      }
      const fh = fieldH.current || height;
      // Coins are swallowed at the wallet's mouth, a little below the top of its artwork.
      const top = fh - WALLET_BOTTOM - WALLET_H + 14;
      const wx = walletRef.current;
      const kept: Drop[] = [];
      for (const d of drops.current) {
        d.y += d.vy * dt;
        const caught = d.y + COIN / 2 >= top && d.y < top + WALLET_H / 2 && d.x + COIN > wx + 8 && d.x < wx + WALLET_W - 8;
        if (caught) {
          collect(d);
          if (livesRef.current <= 0) return;
        } else if (d.y < fh) kept.push(d);
      }
      drops.current = kept;
      setTimeLeft(left);
      setView(drops.current.map((d) => ({ ...d })));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, width, height, finish, collect]);

  const symbol = currencySymbol(currency);
  const seconds = Math.ceil(timeLeft / 1000);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.hud}>
          <IconButton icon="close" label={t('common.close')} onPress={close} />
          <View style={styles.hudMiddle}>
            <Text variant="title" numeric>
              {symbol}
              {score}
            </Text>
            <Text variant="footnote" tone="secondary">
              {t('game.best', { score: best })}
            </Text>
          </View>
          <View style={styles.hudRight}>
            <Text variant="bodyStrong" numeric>
              {phase === 'playing' ? `${seconds}s` : ''}
            </Text>
            <Text variant="callout" accessibilityLabel={t('game.lives', { count: lives })}>
              {'♥'.repeat(Math.max(lives, 0))}
              {'♡'.repeat(LIVES - Math.max(lives, 0))}
            </Text>
          </View>
        </View>

        <View style={styles.field} onLayout={(e: LayoutChangeEvent) => (fieldH.current = e.nativeEvent.layout.height)} {...pan.panHandlers}>
          {phase === 'playing'
            ? view.map((d) => {
                const tax = d.kind === 'tax';
                return (
                  <View
                    key={d.id}
                    pointerEvents="none"
                    style={[
                      styles.coin,
                      {
                        transform: [{ translateX: place(d.x, COIN) }, { translateY: d.y }],
                        backgroundColor: tax ? colors.danger : d.kind === 'gold' ? '#F5B342' : '#FFD66B',
                        borderColor: tax ? colors.danger : '#D9A21B',
                      },
                    ]}
                  >
                    <Text variant="headline" color={tax ? '#FFFFFF' : '#7A5600'} maxFontSizeMultiplier={1}>
                      {tax ? '%' : d.kind === 'gold' ? `${symbol}5` : symbol}
                    </Text>
                  </View>
                );
              })
            : null}

          {phase === 'playing' ? (
            <View
              pointerEvents="none"
              style={[styles.wallet, { transform: [{ translateX: place(walletX, WALLET_W) }] }]}
            >
              <CoinWallet x={walletX} hit={hit} symbol={symbol} />
            </View>
          ) : null}

          {phase !== 'playing' ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card }]}>
              <Text variant="title" align="center">
                {phase === 'over' ? t('game.over', { score }) : t('game.title')}
              </Text>
              <Text variant="callout" tone="secondary" align="center">
                {phase === 'over' ? t('game.best', { score: best }) : t('game.hint')}
              </Text>
              <Button title={phase === 'over' ? t('game.again') : t('game.start')} onPress={start} fullWidth />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingBottom: 8 },
  hudMiddle: { alignItems: 'center' },
  hudRight: { alignItems: 'flex-end', minWidth: 44, paddingEnd: 8 },
  field: { flex: 1, overflow: 'hidden', justifyContent: 'center' },
  wallet: {
    position: 'absolute',
    bottom: WALLET_BOTTOM,
    start: 0,
    width: WALLET_W,
    height: WALLET_H,
  },
  coin: {
    position: 'absolute',
    top: 0,
    start: 0,
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { marginHorizontal: 24, padding: 24, gap: 14, borderWidth: StyleSheet.hairlineWidth },
});
