declare name "HardwareNoise_Simple_v1";
import("stdfaust.lib");

// ================= UI =================
noiseGrp(x) = hgroup("NOISE", x);
active     = noiseGrp(checkbox("Active"));                 // ← Enable → Active
level_dB   = noiseGrp(hslider("Level [dB]",  -36,  -80,   0, 0.1));
hpHz       = noiseGrp(hslider("HPF [Hz]",     200,   20, 1000, 1));
lpHz       = noiseGrp(hslider("LPF [Hz]",    8000, 2000,16000,10));
mixPct     = noiseGrp(hslider("Mix [%]",      100,    0, 100, 1));

// ================= Helpers =================
mixf        = mixPct/100.0;
onSmooth    = active : si.smooth(0.02);                    // 클릭 방지용 페이드
gain_lin    = onSmooth * ba.db2linear(level_dB);
hp2(fc)     = fi.highpass(2, fc);
lp2(fc)     = fi.lowpass(2, fc);

// 두 채널 독립 노이즈
nL = no.noise : hp2(hpHz) : lp2(lpHz);
nR = no.noise : hp2(hpHz) : lp2(lpHz);

// ================= Process (stereo) =================
process(inL, inR) = outL, outR
with {
  hissL = nL * gain_lin;
  hissR = nR * gain_lin;

  outL = inL*(1.0 - mixf) + (inL + hissL)*mixf;
  outR = inR*(1.0 - mixf) + (inR + hissR)*mixf;
};