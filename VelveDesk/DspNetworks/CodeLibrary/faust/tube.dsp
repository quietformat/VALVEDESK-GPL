declare name "This-tressor Saturator (Diode Asym)";
declare version "1.0.0";
declare description "Asymmetric diode-style saturator with 4 knobs (Drive / Saturation / Asymmetry / Mode)";

import("stdfaust.lib");

// -------------------- utils --------------------
anti_denormal(x) = x + 1e-40;
sanity_check(x) = select2(is_problematic(x), x, 0.0) with {
  is_problematic(x) = (abs(x) < 1e-20) | (abs(x) > 1e6) | (x != x);
};
dc_blocker(x) = x : fi.dcblocker;
int_clamp(lo, hi, x) = max(lo, min(hi, x));

// -------------------- GUI (4 knobs only) --------------------
diode_drive      = hslider("Diode Drive[style:knob]",      0.5, 0.1, 5.0, 0.01) : si.smoo;
diode_saturation = hslider("Diode Saturation[style:knob]", 0.8, 0.1, 2.0, 0.01) : si.smoo;
diode_asymmetry  = hslider("Diode Asymmetry[style:knob]",  0.1, 0.0, 0.5, 0.01) : si.smoo;
distMode         = hslider("Distortion Mode[style:knob]",  1,   0,   3,   1) : int : int_clamp(0, 3); 
// 0=Bypass, 1=Asym, 2=Asym(+drive), 3=Hard(+asym)

// -------------------- core distortion --------------------
asymmetric_distortion(x) = diode_function(diode_drive * x) / max(1e-12, diode_drive) with {
  diode_function(x) = positive_clip(x) * (x >= 0) + negative_clip(x) * (x < 0);
  positive_clip(x)  = x / (1 + abs(x / diode_saturation)^1.5);
  negative_clip(x)  = x / (1 + abs(x / (diode_saturation * (1 - diode_asymmetry)))^1.2);
};

hard_clip(x) = max(-0.9, min(0.9, x)) * 1.1;

mode_select(idx, a, b, c, d) =
    (idx == 0) * a +
    (idx == 1) * b +
    (idx == 2) * c +
    (idx == 3) * d;

// 단일 채널 처리
saturate_one(x) = y with {
  base = x : sanity_check : anti_denormal;
  y0   = base;
  y1   = asymmetric_distortion(base);
  y2   = asymmetric_distortion(base * 1.3);
  y3   = hard_clip(asymmetric_distortion(base * 1.8));
  ySel = mode_select(distMode, y0, y1, y2, y3);
  y    = ySel : dc_blocker : sanity_check : anti_denormal;
};

// -------------------- Stereo --------------------
process = saturate_one, saturate_one;