"""Original instrumental score and effects for the 108-second reset sequence.
No recordings, samples, lyrics or external music are used.
Requires Python, NumPy, SciPy and ffmpeg; normal site runtime needs none of them.
"""
from pathlib import Path
import subprocess, tempfile
import numpy as np
from scipy.io import wavfile

RATE=44100
DURATION=108
rng=np.random.default_rng(7506)
audio=np.zeros((RATE*DURATION,2),dtype=np.float32)

def add(start,signal,pan=0):
    offset=round(start*RATE)
    if offset>=len(audio): return
    n=min(len(signal),len(audio)-offset)
    if n<=0:return
    # Equal-power panning. Reverberation is synthesized from delayed copies.
    audio[offset:offset+n,0]+=signal[:n]*np.sqrt((1-pan)/2)
    audio[offset:offset+n,1]+=signal[:n]*np.sqrt((1+pan)/2)

def frequency(midi):return 440*2**((midi-69)/12)
def time(length):return np.arange(round(length*RATE),dtype=np.float32)/RATE

def note(start,midi,length,gain,kind='pluck',pan=0,echo=False):
    t=time(length);f=frequency(midi)
    if kind=='pad':
        sig=(np.sin(2*np.pi*f*t)+.32*np.sin(2*np.pi*f*1.0027*t)+.16*np.sin(4*np.pi*f*t))
        env=np.minimum(1,t/.65)*np.minimum(1,(length-t)/1.2)
        sig*=env*(.93+.07*np.sin(2*np.pi*.25*t))
    elif kind=='bass':
        sig=(np.sin(2*np.pi*f*t)+.3*np.sin(4*np.pi*f*t)+.09*np.sin(6*np.pi*f*t))
        sig*=np.minimum(1,t/.015)*np.exp(-t*3)*np.minimum(1,(length-t)/.06)
    else:
        sig=(np.sin(2*np.pi*f*t)+.2*np.sin(4*np.pi*f*t)+.1*np.sin(6*np.pi*f*t))
        sig*=np.minimum(1,t/.009)*np.exp(-t*5.5)*np.minimum(1,(length-t)/.025)
    sig*=gain
    add(start,sig,pan)
    if echo:
        add(start+.3125,sig*.28,-pan)
        add(start+.625,sig*.13,pan)

def kick(start,gain):
    t=time(.4);phase=2*np.pi*(44*t+70*.035*(1-np.exp(-t/.035)))
    add(start,np.sin(phase)*np.exp(-t*14)*gain)

def percussion(start,gain,kind='hat'):
    length=.055 if kind=='hat' else .18;t=time(length)
    noise=rng.normal(0,1,len(t)).astype(np.float32)
    high=noise-np.concatenate(([0],noise[:-1]))*.8
    signal=high*np.exp(-t*(80 if kind=='hat' else 25))*gain
    if kind=='snare':signal+=np.sin(2*np.pi*170*t)*np.exp(-t*23)*gain*.8
    add(start,signal,.25 if kind=='hat' else -.15)

# D-minor, added-note voicings, gradually developing into the two countdowns.
chords=[[50,57,62,65,69],[46,53,58,62,65],[43,50,57,58,62],[45,52,59,62,64]]
roots=[38,34,31,33]
for i,start in enumerate(np.arange(0,94.0,5.0)):
    gain=.027 if start<17 else .039
    for j,midi in enumerate(chords[i%4]):note(start,midi,6,gain,'pad',pan=(j-2)*.28)
# Gentle low atmosphere immediately establishes that the sequence has sound.
note(0,26,9,.046,'pad')
beat=.625
for i,start in enumerate(np.arange(9,94.4,beat)):
    intensity=min(1,(start-9)/50)
    bar=int(start/5)%4
    note(start,roots[bar],.5,.11+intensity*.05,'bass')
    if start>=17:
        kick(start,.1+intensity*.055)
        if i%2:percussion(start,.045+intensity*.018,'snare')
        percussion(start+.3125,.018+intensity*.01)
        if start>50:percussion(start,.013)
# Original short rising/falling motif with echoes and shifting harmony.
pattern=[0,2,1,3,2,4,1,2]
for i,start in enumerate(np.arange(17,94.4,.3125)):
    chord=chords[int(start/5)%4]
    note(start,chord[pattern[i%8]]+12,.6,.034 if start<50 else .049,pan=.32 if i%2 else -.32,echo=True)
    if start>=81 and i%4==0:note(start,chord[0]+24,.4,.025,pan=-.45,echo=True)
# Airy transitions are synthetic filtered noise, not prerecorded sound effects.
for start in [12.5,22,44.5,50,79.15,81.85]:
    t=time(1.3);noise=rng.normal(0,1,len(t)).astype(np.float32)
    smooth=np.convolve(noise,np.ones(25)/25,mode='same')
    add(start,smooth*np.sin(np.pi*t/1.3)**2*.12,pan=-.25)
# Boot chirps, map pings and both countdowns use the visual sequence's timestamps.
for start in [.65,1.7,3.4,6.5,9,12.5,17,22,26,29.5,33,36.5,40,44.5,50,79.15,81.85]:
    t=time(.22);f=440 if start<22 else 740
    sig=np.sin(2*np.pi*(f*t+90*t*t))*np.minimum(1,t/.007)*np.exp(-t*15)*.1
    add(start,sig,pan=-.15);add(start+.19,sig*.2,pan=.15)
for first,step,count in [(52,1.25,20),(83.65,1.05,10)]:
    for n in range(count,-1,-1):
        t=time(.24);f=660 if n>3 else 880
        sig=(np.sin(2*np.pi*f*t)+.2*np.sin(2*np.pi*f*2*t))*np.minimum(1,t/.006)*np.exp(-t*12)*.14
        add(first+(count-n)*step,sig)
# Cut to black, then an original resolving final chord. Everything fades out.
cut=round(95.0*RATE);audio[cut:]*=0
fade=np.linspace(1,0,round(.35*RATE),dtype=np.float32)
audio[cut-len(fade):cut]*=fade[:,None]
for j,midi in enumerate([38,50,57,62,66,69,76]):note(95.4,midi,12.6,.046,'pad',pan=(j-3)*.22)
kick(95.4,.18)
audio=np.tanh(audio*.95).astype(np.float32)
audio[:round(.08*RATE)]*=np.linspace(0,1,round(.08*RATE),dtype=np.float32)[:,None]
audio[-round(1.5*RATE):]*=np.linspace(1,0,round(1.5*RATE),dtype=np.float32)[:,None]
root=Path(__file__).resolve().parents[1]
output=root/'public'/'reset-soundtrack.mp3'
with tempfile.TemporaryDirectory(prefix='f-reset-audio-') as directory:
    wav=Path(directory)/'original-score.wav'
    wavfile.write(wav,RATE,audio)
    subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),'-af','loudnorm=I=-20:TP=-2:LRA=9','-ar','44100','-c:a','libmp3lame','-b:a','160k','-metadata','title=Feed Water Reset — Original Score','-metadata','artist=Feindschaft','-map_metadata','-1',str(output)],check=True)
print(f'Created {output.name}: {output.stat().st_size} bytes, {DURATION}s, original music and effects.')
