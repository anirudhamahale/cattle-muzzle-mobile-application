import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera, Check, CircleAlert, Video, X, Zap, ZapOff } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/ui/button';
import { Screen } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { captureStore, useCapture } from '@/lib/capture-store';
import { isUsableShot, RECOMMENDED_SHOTS, type Box, type MuzzleShot } from '@/lib/muzzle';
import { processPhoto, processVideo, type GuideMapping } from '@/lib/muzzle/pipeline';

const MAX_VIDEO_SECONDS = 8;
/** Muzzle guide as a fraction of the preview: wide oval-ish box slightly above centre. */
const GUIDE_WIDTH = 0.8;
const GUIDE_ASPECT = 0.72; // height / width

type Mode = 'picture' | 'video';

export default function CaptureScreen() {
  const params = useLocalSearchParams<{ mode?: Mode; purpose?: 'register' | 'identify' }>();
  const identify = params.purpose === 'identify';
  const [camPerm, requestCam] = useCameraPermissions();
  const [micPerm, requestMic] = useMicrophonePermissions();
  const { shots } = useCapture();
  const cameraRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<Mode>(params.mode === 'video' ? 'video' : 'picture');
  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState({ width: 0, height: 0 });

  const usable = shots.filter(isUsableShot).length;

  if (!camPerm) return <View style={styles.black} />;
  if (!camPerm.granted) {
    return (
      <PermissionGate
        message="Camera access is needed to photograph the muzzle."
        canAsk={camPerm.canAskAgain}
        onRequest={requestCam}
      />
    );
  }

  const guideBox: Box = (() => {
    const w = GUIDE_WIDTH;
    const hPx = preview.width * w * GUIDE_ASPECT;
    const h = preview.height ? hPx / preview.height : 0.4;
    return { x: (1 - w) / 2, y: 0.42 - h / 2, width: w, height: h };
  })();
  const mapping: GuideMapping = { preview, guide: guideBox };

  function onLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setPreview({ width, height });
  }

  function report(newShots: MuzzleShot[]) {
    const good = newShots.filter(isUsableShot);
    if (good.length === 0) {
      const issue = newShots[0]?.detection.issues[0];
      setFeedback({ ok: false, text: issue ?? 'No muzzle detected — fill the guide with the nose and try again.' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      const best = Math.round(Math.max(...good.map((s) => s.detection.confidence)) * 100);
      setFeedback({ ok: true, text: `${good.length} muzzle ${good.length === 1 ? 'shot' : 'shots'} added · ${best}% confidence` });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (identify) {
      // Scanning needs one good shot: hand back the best and close.
      const best = [...good].sort((a, b) => b.detection.confidence - a.detection.confidence)[0];
      if (best) {
        captureStore.setIdentifyShot(best);
        router.back();
      }
      return;
    }
    captureStore.addShots(good);
  }

  async function takePhoto() {
    if (!cameraRef.current || !ready || busy) return;
    setBusy('Checking muzzle…');
    setFeedback(null);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const pic = await cameraRef.current.takePictureAsync({ quality: 0.9, shutterSound: false });
      report([await processPhoto(pic, 'camera', mapping)]);
    } catch (e) {
      setFeedback({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  async function toggleRecording() {
    if (!cameraRef.current || !ready) return;
    if (recording) {
      cameraRef.current.stopRecording();
      return;
    }
    if (!micPerm?.granted) {
      const r = await requestMic();
      if (!r.granted) {
        setFeedback({ ok: false, text: 'Microphone permission is needed to record video on this device.' });
        return;
      }
    }
    setFeedback(null);
    setElapsed(0);
    setRecording(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: MAX_VIDEO_SECONDS });
      setRecording(false);
      if (!result?.uri) return;
      setBusy('Extracting muzzle frames…');
      const frames = await processVideo(result.uri, mapping, (done, total) =>
        setBusy(`Analysing frame ${done} of ${total}…`),
      );
      if (!identify) captureStore.setVideo(result.uri);
      report(frames);
    } catch (e) {
      setFeedback({ ok: false, text: (e as Error).message });
    } finally {
      setRecording(false);
      setBusy(null);
    }
  }

  const guidePx = {
    left: guideBox.x * preview.width,
    top: guideBox.y * preview.height,
    width: guideBox.width * preview.width,
    height: guideBox.height * preview.height,
  };

  return (
    <View style={styles.black}>
      <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          mode={mode}
          enableTorch={torch}
          autofocus="on"
          videoQuality="1080p"
          mute
          onCameraReady={() => setReady(true)}
          onRecordingProgress={({ duration }) => setElapsed(Math.floor(duration))}
          onMountError={({ message }) => setFeedback({ ok: false, text: message })}
        />
        {preview.width > 0 && <GuideOverlay rect={guidePx} active={recording} />}
        <View style={[styles.hint, { top: guidePx.top + guidePx.height + Spacing.lg }]} pointerEvents="none">
          <Text variant="label" color={Colors.white} style={styles.center}>
            {recording
              ? `Recording ${elapsed}s / ${MAX_VIDEO_SECONDS}s — move slowly across the muzzle`
              : 'Fill the frame with the muzzle: both nostrils and the ridged pattern between them'}
          </Text>
        </View>
      </View>

      <SafeAreaView style={styles.ui} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <IconButton icon={X} label="Close camera" onPress={() => router.back()} color={Colors.white} background="rgba(0,0,0,0.45)" />
          <View style={styles.counter}>
            <Text variant="label" color={Colors.white}>
              {identify ? 'Scan muzzle to identify' : `${usable}/${RECOMMENDED_SHOTS} muzzle shots`}
            </Text>
          </View>
          <IconButton
            icon={torch ? Zap : ZapOff}
            label={torch ? 'Turn torch off' : 'Turn torch on'}
            onPress={() => setTorch((t) => !t)}
            color={torch ? Colors.accentSoft : Colors.white}
            background="rgba(0,0,0,0.45)"
          />
        </View>

        <View style={styles.bottom}>
          {feedback && (
            <View style={[styles.feedback, { backgroundColor: feedback.ok ? Colors.primary : Colors.destructive }]} accessibilityLiveRegion="polite">
              {feedback.ok ? <Check size={18} color={Colors.white} /> : <CircleAlert size={18} color={Colors.white} />}
              <Text variant="label" color={Colors.white} style={styles.flex}>{feedback.text}</Text>
            </View>
          )}

          <View style={styles.modes}>
            {(['picture', 'video'] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => !recording && !busy && setMode(m)}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === m }}
                style={[styles.modeChip, mode === m && styles.modeChipActive]}>
                {m === 'picture' ? <Camera size={16} color={mode === m ? Colors.foreground : Colors.white} /> : <Video size={16} color={mode === m ? Colors.foreground : Colors.white} />}
                <Text variant="label" color={mode === m ? Colors.foreground : Colors.white}>
                  {m === 'picture' ? 'Photo' : 'Video'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.controls}>
            <View style={styles.side} />
            <Pressable
              onPress={mode === 'picture' ? takePhoto : toggleRecording}
              disabled={!ready || (!!busy && !recording)}
              accessibilityRole="button"
              accessibilityLabel={mode === 'picture' ? 'Take muzzle photo' : recording ? 'Stop recording' : 'Record muzzle video'}
              style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.94 }] }]}>
              {busy && !recording ? (
                <ActivityIndicator color={Colors.primary} size="large" />
              ) : (
                <View style={[styles.shutterInner, mode === 'video' && styles.shutterVideo, recording && styles.shutterStop]} />
              )}
            </Pressable>
            <View style={styles.side}>
              {!identify && usable > 0 && !recording && (
                <Pressable
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel={`Done, ${usable} shots`}
                  style={styles.done}>
                  <Check size={18} color={Colors.onPrimary} />
                  <Text variant="label" color={Colors.onPrimary}>Done</Text>
                </Pressable>
              )}
            </View>
          </View>
          {busy && <Text variant="caption" color={Colors.white} style={styles.center}>{busy}</Text>}
        </View>
      </SafeAreaView>
    </View>
  );
}

/** Dims everything except the muzzle guide and draws corner brackets around it. */
function GuideOverlay({ rect, active }: { rect: { left: number; top: number; width: number; height: number }; active: boolean }) {
  const color = active ? Colors.destructive : Colors.secondary;
  const corner = { position: 'absolute' as const, width: 34, height: 34, borderColor: color };
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[styles.dim, { top: 0, left: 0, right: 0, height: rect.top }]} />
      <View style={[styles.dim, { top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }]} />
      <View style={[styles.dim, { top: rect.top, left: 0, width: rect.left, height: rect.height }]} />
      <View style={[styles.dim, { top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }]} />
      <View style={[styles.guide, rect, { borderColor: `${color}66` }]}>
        <View style={[corner, { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: Radius.xl }]} />
        <View style={[corner, { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: Radius.xl }]} />
        <View style={[corner, { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: Radius.xl }]} />
        <View style={[corner, { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: Radius.xl }]} />
      </View>
    </View>
  );
}

function PermissionGate({ message, canAsk, onRequest }: { message: string; canAsk: boolean; onRequest: () => void }) {
  return (
    <Screen contentStyle={styles.gate}>
      <Camera size={48} color={Colors.primary} />
      <Text variant="title" style={styles.center}>Allow camera</Text>
      <Text color={Colors.mutedForeground} style={styles.center}>{message}</Text>
      {canAsk ? (
        <Button title="Allow camera access" onPress={onRequest} />
      ) : (
        <Button title="Open settings" onPress={() => Linking.openSettings()} />
      )}
      <Button title="Not now" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  black: { flex: 1, backgroundColor: Colors.black },
  ui: { flex: 1, justifyContent: 'space-between' },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  guide: { position: 'absolute', borderWidth: 1, borderRadius: Radius.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  counter: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(0,0,0,0.45)' },
  hint: { position: 'absolute', left: Spacing.xl, right: Spacing.xl },
  bottom: { gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  modes: { flexDirection: 'row', alignSelf: 'center', gap: Spacing.sm, padding: 4, borderRadius: Radius.pill, backgroundColor: 'rgba(0,0,0,0.45)' },
  modeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill },
  modeChipActive: { backgroundColor: Colors.white },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 96, alignItems: 'flex-end' },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.white },
  shutterVideo: { backgroundColor: Colors.destructive },
  shutterStop: { width: 30, height: 30, borderRadius: 6 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill, backgroundColor: Colors.primary },
  gate: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.lg },
});
