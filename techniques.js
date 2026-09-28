// ============================================================
//  YOUR TECHNIQUE DICTIONARY
//  Add, remove or edit entries here. The whole app updates itself.
//
//  id          unique, lowercase, no spaces (used to save progress —
//              don't change it later or that card's progress resets)
//  belt        white | yellow | orange | green | blue | brown | black
//              (placeholder grading — adjust to your club's syllabus)
//  difficulty  1 (easy) to 5 (hard)
//  video       ""                              → no video yet
//              "videos/o-soto-gari.mp4"        → your own clip file
//              "https://youtu.be/XXXXXXXXXXX"  → YouTube embed
// ============================================================
window.TECHNIQUES = [
  // ---------- Nage-waza › Te-waza ----------
  { id: "seoi-nage", name: "Seoi-nage", translation: "Shoulder throw", category: "Nage-waza", subcategory: "Te-waza", belt: "yellow", difficulty: 2, video: "", notes: "Turn in low, bring your partner onto your back, throw over the shoulder." },
  { id: "ippon-seoi-nage", name: "Ippon-seoi-nage", translation: "One-arm shoulder throw", category: "Nage-waza", subcategory: "Te-waza", belt: "yellow", difficulty: 2, video: "", notes: "Your arm locks under partner's armpit; drop your hips below theirs." },
  { id: "tai-otoshi", name: "Tai-otoshi", translation: "Body drop", category: "Nage-waza", subcategory: "Te-waza", belt: "orange", difficulty: 3, video: "", notes: "Block the leg, don't lift — the throw comes from the hands and rotation." },
  { id: "sukui-nage", name: "Sukui-nage", translation: "Scooping throw", category: "Nage-waza", subcategory: "Te-waza", belt: "green", difficulty: 3, video: "", notes: "Scoop the legs from behind and lift partner backwards." },
  { id: "kata-guruma", name: "Kata-guruma", translation: "Shoulder wheel", category: "Nage-waza", subcategory: "Te-waza", belt: "blue", difficulty: 4, video: "", notes: "Load partner across both shoulders and rotate them over." },
  { id: "uki-otoshi", name: "Uki-otoshi", translation: "Floating drop", category: "Nage-waza", subcategory: "Te-waza", belt: "green", difficulty: 4, video: "", notes: "Pure hand technique: kneel and pull partner forward into a circle." },

  // ---------- Nage-waza › Koshi-waza ----------
  { id: "o-goshi", name: "O-goshi", translation: "Major hip throw", category: "Nage-waza", subcategory: "Koshi-waza", belt: "yellow", difficulty: 1, video: "", notes: "Arm around the waist, hips deep across, lift and rotate." },
  { id: "uki-goshi", name: "Uki-goshi", translation: "Floating hip throw", category: "Nage-waza", subcategory: "Koshi-waza", belt: "yellow", difficulty: 2, video: "", notes: "Only half the hip goes in; partner floats around your side." },
  { id: "koshi-guruma", name: "Koshi-guruma", translation: "Hip wheel", category: "Nage-waza", subcategory: "Koshi-waza", belt: "orange", difficulty: 2, video: "", notes: "Arm around the neck, hips fully past partner's hips." },
  { id: "harai-goshi", name: "Harai-goshi", translation: "Sweeping hip throw", category: "Nage-waza", subcategory: "Koshi-waza", belt: "orange", difficulty: 3, video: "", notes: "Hip contact plus a sweep of the outside thigh." },
  { id: "tsuri-komi-goshi", name: "Tsuri-komi-goshi", translation: "Lifting-pulling hip throw", category: "Nage-waza", subcategory: "Koshi-waza", belt: "green", difficulty: 3, video: "", notes: "Lift with the lapel hand, drop the hips low under partner." },
  { id: "hane-goshi", name: "Hane-goshi", translation: "Spring hip throw", category: "Nage-waza", subcategory: "Koshi-waza", belt: "blue", difficulty: 4, video: "", notes: "The bent leg springs up against partner's inner thigh." },

  // ---------- Nage-waza › Ashi-waza ----------
  { id: "o-soto-gari", name: "O-soto-gari", translation: "Major outer reap", category: "Nage-waza", subcategory: "Ashi-waza", belt: "yellow", difficulty: 1, video: "", notes: "Break balance to the rear corner, reap with the back of your leg." },
  { id: "o-uchi-gari", name: "O-uchi-gari", translation: "Major inner reap", category: "Nage-waza", subcategory: "Ashi-waza", belt: "yellow", difficulty: 2, video: "", notes: "Reap the inside of partner's leg in a wide circle, push backwards." },
  { id: "de-ashi-barai", name: "De-ashi-barai", translation: "Advanced foot sweep", category: "Nage-waza", subcategory: "Ashi-waza", belt: "yellow", difficulty: 3, video: "", notes: "Sweep the foot just before it takes weight. Timing is everything." },
  { id: "ko-uchi-gari", name: "Ko-uchi-gari", translation: "Minor inner reap", category: "Nage-waza", subcategory: "Ashi-waza", belt: "orange", difficulty: 2, video: "", notes: "Sole of your foot reaps partner's heel from the inside." },
  { id: "ko-soto-gari", name: "Ko-soto-gari", translation: "Minor outer reap", category: "Nage-waza", subcategory: "Ashi-waza", belt: "orange", difficulty: 2, video: "", notes: "Reap the heel from the outside in the direction of the toes." },
  { id: "hiza-guruma", name: "Hiza-guruma", translation: "Knee wheel", category: "Nage-waza", subcategory: "Ashi-waza", belt: "orange", difficulty: 2, video: "", notes: "Sole blocks the knee, hands turn partner like a steering wheel." },
  { id: "sasae-tsurikomi-ashi", name: "Sasae-tsurikomi-ashi", translation: "Propping drawing ankle throw", category: "Nage-waza", subcategory: "Ashi-waza", belt: "orange", difficulty: 3, video: "", notes: "Block the ankle with your sole and draw partner forward over it." },
  { id: "uchi-mata", name: "Uchi-mata", translation: "Inner thigh throw", category: "Nage-waza", subcategory: "Ashi-waza", belt: "green", difficulty: 4, video: "", notes: "Lift between partner's legs with the back of your thigh." },

  // ---------- Nage-waza › Sutemi-waza ----------
  { id: "tomoe-nage", name: "Tomoe-nage", translation: "Circle throw", category: "Nage-waza", subcategory: "Ma-sutemi-waza", belt: "green", difficulty: 3, video: "", notes: "Sit down under partner, foot on the belt, throw over your head." },
  { id: "sumi-gaeshi", name: "Sumi-gaeshi", translation: "Corner reversal", category: "Nage-waza", subcategory: "Ma-sutemi-waza", belt: "blue", difficulty: 3, video: "", notes: "Fall back, instep lifts partner's inner thigh toward the corner." },
  { id: "tani-otoshi", name: "Tani-otoshi", translation: "Valley drop", category: "Nage-waza", subcategory: "Yoko-sutemi-waza", belt: "blue", difficulty: 3, video: "", notes: "Slide your leg behind both of partner's legs and drop sideways." },
  { id: "yoko-guruma", name: "Yoko-guruma", translation: "Side wheel", category: "Nage-waza", subcategory: "Yoko-sutemi-waza", belt: "brown", difficulty: 4, video: "", notes: "Counter: slide between partner's legs and wheel them over." },

  // ---------- Katame-waza › Osaekomi-waza ----------
  { id: "kesa-gatame", name: "Kesa-gatame", translation: "Scarf hold", category: "Katame-waza", subcategory: "Osaekomi-waza", belt: "white", difficulty: 1, video: "", notes: "Sit at partner's side, control head and arm, legs wide." },
  { id: "yoko-shiho-gatame", name: "Yoko-shiho-gatame", translation: "Side four-quarter hold", category: "Katame-waza", subcategory: "Osaekomi-waza", belt: "yellow", difficulty: 1, video: "", notes: "Chest across partner's chest, one arm between the legs." },
  { id: "kami-shiho-gatame", name: "Kami-shiho-gatame", translation: "Upper four-quarter hold", category: "Katame-waza", subcategory: "Osaekomi-waza", belt: "yellow", difficulty: 1, video: "", notes: "From the head side, grip the belt under both arms." },
  { id: "kata-gatame", name: "Kata-gatame", translation: "Shoulder hold", category: "Katame-waza", subcategory: "Osaekomi-waza", belt: "yellow", difficulty: 2, video: "", notes: "Trap partner's arm against their own head with yours." },
  { id: "tate-shiho-gatame", name: "Tate-shiho-gatame", translation: "Vertical four-quarter hold", category: "Katame-waza", subcategory: "Osaekomi-waza", belt: "orange", difficulty: 2, video: "", notes: "Sit astride partner's body, legs hook under theirs." },

  // ---------- Katame-waza › Shime-waza ----------
  { id: "hadaka-jime", name: "Hadaka-jime", translation: "Naked choke", category: "Katame-waza", subcategory: "Shime-waza", belt: "green", difficulty: 2, video: "", notes: "From behind, forearm across the throat without using the gi." },
  { id: "nami-juji-jime", name: "Nami-juji-jime", translation: "Normal cross choke", category: "Katame-waza", subcategory: "Shime-waza", belt: "green", difficulty: 2, video: "", notes: "Both hands deep in the collar, palms up, pull elbows apart." },
  { id: "okuri-eri-jime", name: "Okuri-eri-jime", translation: "Sliding collar choke", category: "Katame-waza", subcategory: "Shime-waza", belt: "blue", difficulty: 3, video: "", notes: "From behind, one hand feeds the lapel to the other." },

  // ---------- Katame-waza › Kansetsu-waza ----------
  { id: "ude-hishigi-juji-gatame", name: "Ude-hishigi-juji-gatame", translation: "Cross armlock", category: "Katame-waza", subcategory: "Kansetsu-waza", belt: "green", difficulty: 3, video: "", notes: "Legs across the chest, thumb up, lift the hips." },
  { id: "ude-garami", name: "Ude-garami", translation: "Entangled armlock", category: "Katame-waza", subcategory: "Kansetsu-waza", belt: "green", difficulty: 3, video: "", notes: "Figure-four grip on the bent arm, rotate like a key." },
  { id: "ude-hishigi-waki-gatame", name: "Ude-hishigi-waki-gatame", translation: "Armpit armlock", category: "Katame-waza", subcategory: "Kansetsu-waza", belt: "blue", difficulty: 3, video: "", notes: "Trap the straight arm under your armpit and turn away." },
];
