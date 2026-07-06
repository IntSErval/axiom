export type TaskStatus    = 'todo' | 'in_progress' | 'done';
export type AccountType   = 'checking' | 'savings' | 'investment';
export type BudgetPeriod  = 'monthly' | 'weekly';
export type HabitFrequency= 'daily' | 'weekly' | 'monthly';
export type GoalStatus    = 'active' | 'completed' | 'abandoned';
export type MilestoneStatus = 'pending' | 'achieved';

export interface Task     { id: string; user_id: string; title: string; description: string | null; priority: 1|2|3|4; status: TaskStatus; project_id: string | null; due_date: string | null; created_at: string; updated_at: string }
export interface Project  { id: string; user_id: string; name: string; color: string; created_at: string }
export interface Habit    { id: string; user_id: string; name: string; frequency: HabitFrequency; target: number; streak: number; created_at: string }
export interface HabitLog { id: string; habit_id: string; completed_at: string; note: string | null }
export interface Account  { id: string; user_id: string; name: string; type: AccountType; balance: number; created_at: string }
export interface Transaction { id: string; user_id: string; account_id: string; amount: number; category: string; description: string | null; date: string }
export interface Budget   { id: string; user_id: string; category: string; limit_amount: number; period: BudgetPeriod; created_at: string }
export interface Goal     { id: string; user_id: string; title: string; target_amount: number; current_amount: number; deadline: string | null; status: GoalStatus; created_at: string }
export interface Milestone{ id: string; goal_id: string; title: string; target_amount: number; status: MilestoneStatus; due_date: string | null }