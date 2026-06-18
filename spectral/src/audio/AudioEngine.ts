export class AudioEngine {
    private ctx: AudioContext | null = null
    private analyser: AnalyserNode | null = null
    private source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null
  
    async connectMic() {
      this.ctx = new AudioContext()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.source = this.ctx.createMediaStreamSource(stream)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 2048
      this.source.connect(this.analyser)
    }
  
    connectFile(el: HTMLAudioElement) {
      this.ctx = new AudioContext()
      this.source = this.ctx.createMediaElementSource(el)
      this.analyser = this.ctx.createAnalyser()
      this.analyser.fftSize = 2048
      this.source.connect(this.analyser)
      this.analyser.connect(this.ctx.destination)
    }
  
    getAnalyser() { return this.analyser }
    resume() { this.ctx?.resume() }
  }