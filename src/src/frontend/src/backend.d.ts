import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface PaymentSubmission {
    id: string;
    status: string;
    user: Principal;
    refunded: boolean;
    amountPaid: number;
    matchId: string;
    approved: boolean;
    timestamp: bigint;
    refundTimestamp?: bigint;
    screenshot: ExternalBlob;
}
export interface Match {
    id: string;
    matchType: string;
    startTime: bigint;
    status: string;
    participants: Array<Principal>;
    createdAt: bigint;
    entryFee: number;
}
export interface UserProfile {
    refundPaymentQrCode: ExternalBlob;
    displayName: string;
    email: string;
    gamePlayerId: string;
    gameName: string;
    phoneNumber: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    approvePayment(paymentId: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createMatch(id: string, matchType: string, entryFee: number, startTime: bigint): Promise<void>;
    deleteMatch(matchId: string): Promise<void>;
    getAllMatches(): Promise<Array<Match>>;
    getAllPayments(): Promise<Array<PaymentSubmission>>;
    getAllUsers(): Promise<Array<UserProfile>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getMatchDetails(matchId: string): Promise<Match | null>;
    getMatchParticipants(matchId: string): Promise<Array<Principal>>;
    getMatchesByStatus(status: string): Promise<Array<Match>>;
    getPaymentStatus(matchId: string): Promise<PaymentSubmission | null>;
    getPendingPayments(): Promise<Array<PaymentSubmission>>;
    getUserMatches(): Promise<Array<Match>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserRole(): Promise<string | null>;
    getUserTransactionHistory(): Promise<Array<PaymentSubmission>>;
    isAdminByDisplayName(): Promise<boolean>;
    isCallerAdmin(): Promise<boolean>;
    joinMatch(matchId: string): Promise<void>;
    markAsRefunded(paymentId: string): Promise<void>;
    rejectPayment(paymentId: string): Promise<void>;
    removeUser(user: Principal): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    submitPayment(matchId: string, screenshot: ExternalBlob, amountPaid: number): Promise<void>;
    updateUserProfile(user: Principal, profile: UserProfile): Promise<void>;
}
