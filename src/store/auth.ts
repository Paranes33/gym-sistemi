'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Gym, Member } from '@/types'

interface AuthState {
  user: User | null
  member: Member | null
  gym: Gym | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User | null) => void
  setMember: (member: Member | null) => void
  setGym: (gym: Gym | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  login: (user: User, token: string, member?: Member, gym?: Gym) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      member: null,
      gym: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user }),
      setMember: (member) => set({ member }),
      setGym: (gym) => set({ gym }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),

      login: (user, token, member, gym) => set({
        user,
        token,
        member: member || null,
        gym: gym || null,
        isAuthenticated: true,
        isLoading: false
      }),

      logout: () => set({
        user: null,
        member: null,
        gym: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      }))
    }),
    {
      name: 'gym-auth-storage',
      partialize: (state) => ({
        user: state.user,
        member: state.member,
        gym: state.gym,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Helper hooks
export const useUser = () => useAuthStore((state) => state.user)
export const useMember = () => useAuthStore((state) => state.member)
export const useGym = () => useAuthStore((state) => state.gym)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useIsLoading = () => useAuthStore((state) => state.isLoading)

// Role check hooks
export const useIsSuperAdmin = () => useAuthStore((state) => state.user?.role === 'SUPER_ADMIN')
export const useIsSalonAdmin = () => useAuthStore((state) => state.user?.role === 'SALON_ADMIN')
export const useIsMember = () => useAuthStore((state) => state.user?.role === 'MEMBER')
