export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
  /** Optional: how this movement is run (e.g. "10 sets · specialization", "rest-pause", "EMOM") */
  style?: string;
  /** Optional: the reason this movement is here, in one plain sentence */
  why?: string;
  /** Optional: a load target the coach committed to (e.g. "3 plates/side") */
  target?: string;
}

export interface WorkoutDay {
  id: number;
  name: string;
  shortName: string;
  type: 'training' | 'rest' | 'conditioning';
  focus?: string;
  warmup?: string[];
  exercises?: Exercise[];
  conditioning?: {
    activity: string;
    duration: string;
    intensity: string;
  };
  extras?: string[];
  /** Optional: training style for the day — e.g. "specialization", "strength", "density" */
  style?: string;
  /** Optional: the coach's reasoning for the day, so the lifter learns the programming */
  why?: string;
}


export const workoutPlan: WorkoutDay[] = [
  {
    id: 1,
    name: "Upper Body Power",
    shortName: "Upper Power",
    type: "training",
    focus: "Chest, Shoulders, Triceps & Calisthenics",
    warmup: [
      "Jumping Jacks: 2 minutes",
      "Arm Circles: 30 sec each direction",
      "Shoulder Pass-Throughs: 1 minute",
      "Push-up to Downward Dog: 1 minute"
    ],
    exercises: [
      { id: "1-1", name: "Barbell Bench Press", sets: 4, reps: "4-6", rest: "120-180s", notes: "Keep shoulder blades retracted" },
      { id: "1-2", name: "Incline Dumbbell Press", sets: 3, reps: "6-8", rest: "90-120s", notes: "30-45 degree angle" },
      { id: "1-3", name: "Overhead Press", sets: 4, reps: "5-7", rest: "120-180s", notes: "Core tight, glutes engaged" },
      { id: "1-4", name: "Dumbbell Lateral Raises", sets: 3, reps: "10-15", rest: "60-90s", notes: "Lead with elbows" },
      { id: "1-5", name: "Weighted Dips", sets: 3, reps: "6-8", rest: "90-120s", notes: "Lean forward for chest" },
      { id: "1-6", name: "Close-Grip Bench Press", sets: 3, reps: "8-10", rest: "60-90s" },
      { id: "1-7", name: "Muscle-Up Negatives", sets: 3, reps: "3-5", rest: "60-90s", notes: "Control the descent" },
      { id: "1-8", name: "L-Sit Hold", sets: 3, reps: "Max", rest: "60s" }
    ]
  },
  {
    id: 2,
    name: "Lower Body Hypertrophy",
    shortName: "Lower Hyper",
    type: "training",
    focus: "Quads, Hamstrings, Calves",
    warmup: [
      "Bodyweight Squats: 2 minutes",
      "Leg Swings: 1 min per leg",
      "Cat-Cow Stretch: 1 minute"
    ],
    exercises: [
      { id: "2-1", name: "Barbell Back Squat", sets: 4, reps: "8-12", rest: "90-120s", notes: "Thighs parallel minimum" },
      { id: "2-2", name: "Romanian Deadlift", sets: 4, reps: "10-15", rest: "90-120s", notes: "Feel the hamstring stretch" },
      { id: "2-3", name: "Leg Press", sets: 3, reps: "10-15", rest: "60-90s" },
      { id: "2-4", name: "Leg Curls", sets: 3, reps: "12-15", rest: "60s" },
      { id: "2-5", name: "Leg Extensions", sets: 3, reps: "12-15", rest: "60s" },
      { id: "2-6", name: "Standing Calf Raises", sets: 4, reps: "15-20", rest: "45-60s" },
      { id: "2-7", name: "Seated Calf Raises", sets: 2, reps: "15-20", rest: "45-60s" }
    ]
  },
  {
    id: 3,
    name: "Rest & Conditioning",
    shortName: "Recovery",
    type: "conditioning",
    conditioning: {
      activity: "Brisk Walking or Light Cycling",
      duration: "30-45 minutes",
      intensity: "Low to moderate"
    },
    extras: [
      "Kegels: 3 sets × 15-20 reps, 3-5 sec hold",
      "Focus on nutrition and hydration"
    ]
  },
  {
    id: 4,
    name: "Upper Body Hypertrophy",
    shortName: "Upper Hyper",
    type: "training",
    focus: "Back, Biceps, Traps",
    warmup: [
      "Rowing Machine: 3 minutes light",
      "Band Pull-Aparts: 2 × 15",
      "Scapular Pull-ups: 2 × 10"
    ],
    exercises: [
      { id: "4-1", name: "Weighted Pull-ups", sets: 4, reps: "6-8", rest: "90-120s" },
      { id: "4-2", name: "Barbell Bent-Over Rows", sets: 4, reps: "8-10", rest: "90-120s", notes: "Squeeze shoulder blades" },
      { id: "4-3", name: "Face Pulls", sets: 3, reps: "12-15", rest: "60-90s", notes: "Elbows high" },
      { id: "4-4", name: "Bent-Over Dumbbell Raises", sets: 3, reps: "10-15", rest: "60-90s", notes: "Rear delts focus" },
      { id: "4-5", name: "Barbell Shrugs", sets: 4, reps: "8-12", rest: "60-90s", notes: "No rolling" },
      { id: "4-6", name: "Dumbbell Farmer's Walks", sets: 3, reps: "50 ft", rest: "60s" },
      { id: "4-7", name: "Barbell Curls", sets: 3, reps: "10-12", rest: "60s" },
      { id: "4-8", name: "Incline Dumbbell Curls", sets: 3, reps: "10-12", rest: "60s" }
    ]
  },
  {
    id: 5,
    name: "Lower Body Power",
    shortName: "Lower Power",
    type: "training",
    focus: "Power & Calisthenics",
    warmup: [
      "Box Jumps (low): 2 minutes",
      "Deep Squat Hold: 1 minute",
      "Glute Bridges: 2 × 15"
    ],
    exercises: [
      { id: "5-1", name: "Barbell Deadlifts", sets: 4, reps: "3-5", rest: "180-240s", notes: "Drive through heels" },
      { id: "5-2", name: "Front Squats", sets: 3, reps: "5-7", rest: "120-180s", notes: "Elbows high, chest up" },
      { id: "5-3", name: "Bulgarian Split Squats", sets: 3, reps: "6-8", rest: "90-120s" },
      { id: "5-4", name: "Box Jumps (height)", sets: 3, reps: "5", rest: "60-90s" },
      { id: "5-5", name: "Pistol Squat Progressions", sets: 3, reps: "5-8", rest: "60-90s" },
      { id: "5-6", name: "Hanging Leg Raises", sets: 3, reps: "10-15", rest: "60s" }
    ]
  },
  {
    id: 6,
    name: "Rest & Conditioning",
    shortName: "Recovery",
    type: "conditioning",
    conditioning: {
      activity: "Brisk Walking or Light Cycling",
      duration: "30-45 minutes",
      intensity: "Low to moderate"
    },
    extras: [
      "Kegels: 3 sets × 15-20 reps, 3-5 sec hold",
      "Focus on nutrition and hydration"
    ]
  },
  {
    id: 7,
    name: "Complete Rest",
    shortName: "Rest",
    type: "rest",
    extras: [
      "Your body repairs and grows",
      "Focus on nutrition",
      "Stay hydrated",
      "Get 7-9 hours of sleep"
    ]
  }
];

export const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
