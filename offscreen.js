function playTone() {
  const AudioContext = self.AudioContext || self.webkitAudioContext;
  if (!AudioContext) return;

  const context = new AudioContext();
  const gain = context.createGain();
  const oscillator = context.createOscillator();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.setValueAtTime(1174.66, context.currentTime + 0.09);

  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.26);

  oscillator.addEventListener("ended", () => {
    context.close().catch(() => {});
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== "chatgpt-waiting-favicon:play-sound") return;
  playTone();
});
