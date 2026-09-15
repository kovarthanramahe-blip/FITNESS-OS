import { Award, Flame, Medal, Rocket, Star, Trophy } from 'lucide-react'
import type { Achievement, Challenge } from '@/types/achievements'

export const mockAchievements: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Steps',
    description: 'Complete your first workout',
    icon: Star,
    unlocked: true,
    unlockedDate: 'Jul 2',
    xpReward: 50,
  },
  {
    id: 'ach-2',
    title: '10-Day Streak',
    description: 'Log in and train 10 days in a row',
    icon: Flame,
    unlocked: true,
    unlockedDate: 'Aug 14',
    xpReward: 150,
  },
  {
    id: 'ach-3',
    title: 'Century Club',
    description: 'Complete 100 total workouts',
    icon: Medal,
    unlocked: false,
    xpReward: 300,
  },
  {
    id: 'ach-4',
    title: 'Iron Will',
    description: 'Hit a new personal record in 5 lifts',
    icon: Trophy,
    unlocked: false,
    xpReward: 250,
  },
  {
    id: 'ach-5',
    title: 'Level 10',
    description: 'Reach level 10 in Fitness OS',
    icon: Rocket,
    unlocked: false,
    xpReward: 400,
  },
  {
    id: 'ach-6',
    title: 'Well Rounded',
    description: 'Log workouts, nutrition and habits for 30 days straight',
    icon: Award,
    unlocked: false,
    xpReward: 500,
  },
]

export const mockChallenges: Challenge[] = [
  {
    id: 'chal-1',
    title: 'September Volume Push',
    description: 'Lift 50 tonnes of total volume this month',
    progress: 34,
    goal: 50,
    unit: 't',
    daysLeft: 12,
    xpReward: 200,
  },
  {
    id: 'chal-2',
    title: 'Hydration Challenge',
    description: 'Hit your water target every day this week',
    progress: 5,
    goal: 7,
    unit: 'days',
    daysLeft: 2,
    xpReward: 100,
  },
  {
    id: 'chal-3',
    title: '10K Steps Streak',
    description: 'Walk 10,000+ steps for 14 days straight',
    progress: 9,
    goal: 14,
    unit: 'days',
    daysLeft: 5,
    xpReward: 180,
  },
]
