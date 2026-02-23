import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { Match, PaymentSubmission, UserProfile, UserRole } from '../backend.d.ts';
import type { Principal } from '@icp-sdk/core/principal';

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();

  return useQuery<UserRole>({
    queryKey: ['currentUserRole'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// Match Queries
export function useGetAllMatches() {
  const { actor, isFetching } = useActor();

  return useQuery<Match[]>({
    queryKey: ['matches'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMatches();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMatchDetails(matchId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Match | null>({
    queryKey: ['match', matchId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMatchDetails(matchId);
    },
    enabled: !!actor && !isFetching && !!matchId,
  });
}

export function useGetMatchesByStatus(status: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Match[]>({
    queryKey: ['matches', 'status', status],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMatchesByStatus(status);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUserMatches() {
  const { actor, isFetching } = useActor();

  return useQuery<Match[]>({
    queryKey: ['userMatches'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserMatches();
    },
    enabled: !!actor && !isFetching,
  });
}

// Payment Queries
export function useGetPendingPayments() {
  const { actor, isFetching } = useActor();

  return useQuery<PaymentSubmission[]>({
    queryKey: ['pendingPayments'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingPayments();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 5000, // Poll every 5 seconds for admin dashboard
  });
}

export function useGetPaymentStatus(matchId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<PaymentSubmission | null>({
    queryKey: ['payment', matchId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getPaymentStatus(matchId);
    },
    enabled: !!actor && !isFetching && !!matchId,
  });
}

export function useGetUserTransactionHistory() {
  const { actor, isFetching } = useActor();

  return useQuery<PaymentSubmission[]>({
    queryKey: ['userTransactionHistory'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserTransactionHistory();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllUsers() {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile[]>({
    queryKey: ['allUsers'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMatchParticipants(matchId: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Principal[]>({
    queryKey: ['matchParticipants', matchId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMatchParticipants(matchId);
    },
    enabled: !!actor && !isFetching && !!matchId,
  });
}

export function useGetUserProfile(userPrincipal: Principal | null) {
  const { actor, isFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ['userProfile', userPrincipal?.toString()],
    queryFn: async () => {
      if (!actor || !userPrincipal) return null;
      return actor.getUserProfile(userPrincipal);
    },
    enabled: !!actor && !isFetching && !!userPrincipal,
  });
}

// Mutations
export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useCreateMatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, matchType, entryFee, startTime }: { id: string; matchType: string; entryFee: number; startTime: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createMatch(id, matchType, entryFee, startTime);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useJoinMatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.joinMatch(matchId);
    },
    onSuccess: (_, matchId) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      queryClient.invalidateQueries({ queryKey: ['userMatches'] });
    },
  });
}

export function useSubmitPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, screenshot, amountPaid }: { matchId: string; screenshot: any; amountPaid: number }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.submitPayment(matchId, screenshot, amountPaid);
    },
    onSuccess: (_, { matchId }) => {
      queryClient.invalidateQueries({ queryKey: ['payment', matchId] });
      queryClient.invalidateQueries({ queryKey: ['userMatches'] });
      queryClient.invalidateQueries({ queryKey: ['userTransactionHistory'] });
    },
  });
}

export function useApprovePayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.approvePayment(paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useRejectPayment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.rejectPayment(paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useBookAllSlots() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.bookAllSlots(matchId);
    },
    onSuccess: (_, matchId) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      queryClient.invalidateQueries({ queryKey: ['userMatches'] });
    },
  });
}

export function useUpdateUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, profile }: { user: Principal; profile: UserProfile }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateUserProfile(user, profile);
    },
    onSuccess: (_, { user }) => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', user.toString()] });
    },
  });
}

export function useRemoveUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (user: Principal) => {
      if (!actor) throw new Error('Actor not available');
      return actor.removeUser(user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useMarkAsRefunded() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      if (!actor) throw new Error('Actor not available');
      return actor.markAsRefunded(paymentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingPayments'] });
      queryClient.invalidateQueries({ queryKey: ['userTransactionHistory'] });
    },
  });
}
