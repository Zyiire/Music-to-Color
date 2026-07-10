export class AudioEngine {
    private ctx: AudioContext | null = null
    private analyser: AnalyserNode | null = null
    private source: MediaStreamAudioSourceNode | null = null
  
    async connectMic() {
      this.ctx = new AudioContext()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.source = this.ctx.createMediaStreamSource(stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 2048
      this.source.connect(this.analyser)
    }
  
    getAnalyser() { return this.analyser }
    resume() { this.ctx?.resume() }
  }