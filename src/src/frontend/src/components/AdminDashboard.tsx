import { useState, useEffect } from 'react';
import { useGetAllMatches, useGetPendingPayments, useCreateMatch, useApprovePayment, useRejectPayment, useGetAllUsers, useGetMatchParticipants, useGetUserProfile, useUpdateUserProfile, useRemoveUser, useMarkAsRefunded, useGetUserTransactionHistory } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Users, DollarSign, Clock, CheckCircle, XCircle, Loader2, Image as ImageIcon, Eye, Edit, Trash2, UserCog, RefreshCw, Receipt } from 'lucide-react';
import type { Match, PaymentSubmission, UserProfile } from '../backend.d.ts';
import type { Principal } from '@icp-sdk/core/principal';
import { ExternalBlob } from '../backend';

export default function AdminDashboard() {
  const { data: matches = [], isLoading: matchesLoading } = useGetAllMatches();
  const { data: pendingPayments = [], isLoading: paymentsLoading } = useGetPendingPayments();
  const { data: allUsers = [], isLoading: usersLoading } = useGetAllUsers();
  const createMatch = useCreateMatch();
  const approvePayment = useApprovePayment();
  const rejectPayment = useRejectPayment();
  const markAsRefunded = useMarkAsRefunded();
  const updateUserProfile = useUpdateUserProfile();
  const removeUser = useRemoveUser();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    matchType: 'solo',
    entryFee: '',
    startTime: '',
  });
  const [showParticipantsDialog, setShowParticipantsDialog] = useState(false);
  const [selectedMatchForParticipants, setSelectedMatchForParticipants] = useState<Match | null>(null);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [showUserEditDialog, setShowUserEditDialog] = useState(false);
  const [showUserDeleteDialog, setShowUserDeleteDialog] = useState(false);
  const [selectedUserPrincipal, setSelectedUserPrincipal] = useState<Principal | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  const getMatchTypeMaxParticipants = (matchType: string) => {
    return 2; // 1v1 only
  };

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const entryFee = parseFloat(createForm.entryFee);
    if (isNaN(entryFee) || entryFee <= 0) {
      toast.error('Please enter a valid entry fee');
      return;
    }

    if (!createForm.startTime) {
      toast.error('Please select a start time');
      return;
    }

    // Convert datetime-local to bigint nanoseconds
    const startTimeMs = new Date(createForm.startTime).getTime();
    const startTimeNs = BigInt(startTimeMs) * BigInt(1000000); // Convert ms to ns

    const matchId = `MATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    try {
      await createMatch.mutateAsync({
        id: matchId,
        matchType: createForm.matchType,
        entryFee,
        startTime: startTimeNs,
      });
      toast.success('Match created successfully');
      setShowCreateDialog(false);
      setCreateForm({ matchType: 'solo', entryFee: '', startTime: '' });
    } catch (error) {
      toast.error('Failed to create match');
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    try {
      await approvePayment.mutateAsync(paymentId);
      toast.success('Payment approved');
    } catch (error) {
      toast.error('Failed to approve payment');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    try {
      await rejectPayment.mutateAsync(paymentId);
      toast.success('Payment rejected');
    } catch (error) {
      toast.error('Failed to reject payment');
    }
  };

  const handleMarkAsRefunded = async (paymentId: string) => {
    try {
      await markAsRefunded.mutateAsync(paymentId);
      toast.success('Marked as refunded');
    } catch (error) {
      toast.error('Failed to mark as refunded');
    }
  };

  const filteredUsers = allUsers.filter((user) => {
    const query = userSearchQuery.toLowerCase();
    return (
      user.displayName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.gamePlayerId?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (match: Match) => {
    const maxParticipants = getMatchTypeMaxParticipants(match.matchType);
    const isFull = match.participants.length >= maxParticipants;

    if (match.status === 'completed') {
      return <Badge variant="secondary" className="font-mono">COMPLETED</Badge>;
    }
    if (match.status === 'in-progress') {
      return <Badge className="bg-warning text-warning-foreground font-mono">IN PROGRESS</Badge>;
    }
    if (isFull) {
      return <Badge className="bg-primary text-primary-foreground font-mono">FULL</Badge>;
    }
    return <Badge className="bg-success text-success-foreground font-mono">OPEN</Badge>;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card className="border-primary/20 hover:border-primary transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-body text-muted-foreground uppercase tracking-wider">Total Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-bold text-primary">{matches.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-warning/20 hover:border-warning transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-body text-muted-foreground uppercase tracking-wider">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-bold text-warning">{pendingPayments.length}</div>
          </CardContent>
        </Card>
        
        <Card className="border-success/20 hover:border-success transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-body text-muted-foreground uppercase tracking-wider">Active Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-bold text-success">
              {matches.reduce((sum, m) => sum + m.participants.length, 0)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:border-primary transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-body text-muted-foreground uppercase tracking-wider">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-display font-bold text-primary">{allUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Create Match Button */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button size="lg" className="w-full md:w-auto font-display text-lg">
            <Plus className="mr-2 h-5 w-5" />
            Create New Match
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Create Match</DialogTitle>
            <DialogDescription>Set up a new match for players to join</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="matchType">Match Type</Label>
              <Input
                id="matchType"
                value="1v1 Solo Match"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Only 1v1 matches are supported</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Match Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={createForm.startTime}
                onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">Select when the match will start</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="entryFee">Entry Fee (INR)</Label>
              <Input
                id="entryFee"
                type="number"
                placeholder="100"
                value={createForm.entryFee}
                onChange={(e) => setCreateForm({ ...createForm, entryFee: e.target.value })}
                required
                min="1"
                step="0.01"
              />
            </div>
            <Button type="submit" className="w-full font-display" disabled={createMatch.isPending}>
              {createMatch.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Match'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Main Grid: Matches and Payments */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Matches List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              All Matches
            </CardTitle>
            <CardDescription>Manage all active and completed matches</CardDescription>
          </CardHeader>
          <CardContent>
            {matchesLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No matches created yet</div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {matches.map((match) => {
                    const maxParticipants = getMatchTypeMaxParticipants(match.matchType);
                    return (
                      <Card key={match.id} className="border-border hover:border-primary/50 transition-all">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="space-y-1">
                              <div className="font-mono text-xs text-primary">{match.id}</div>
                              <div className="font-display text-xl font-bold">1v1 Solo</div>
                            </div>
                            {getStatusBadge(match)}
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-warning" />
                              <span className="text-muted-foreground">Start:</span>
                              <span className="font-semibold">
                                {new Date(Number(match.startTime) / 1000000).toLocaleString('en-IN', {
                                  dateStyle: 'short',
                                  timeStyle: 'short'
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-success" />
                              <span className="text-muted-foreground">Entry:</span>
                              <span className="font-semibold">₹{match.entryFee}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              <span className="text-muted-foreground">Players:</span>
                              <span className="font-semibold">{match.participants.length}/{maxParticipants}</span>
                            </div>
                          </div>

                          {match.participants.length > 0 && (
                            <>
                              <Separator className="my-2" />
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full font-display"
                                onClick={() => {
                                  setSelectedMatchForParticipants(match);
                                  setShowParticipantsDialog(true);
                                }}
                              >
                                <Users className="mr-2 h-4 w-4" />
                                View Participants
                              </Button>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl flex items-center gap-2">
              <Clock className="h-6 w-6 text-warning" />
              Pending Payments
            </CardTitle>
            <CardDescription>Review and confirm payment submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-warning" />
              </div>
            ) : pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No pending payments</div>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-4">
                  {pendingPayments.map((payment) => {
                    const match = matches.find((m) => m.id === payment.matchId);
                    return (
                      <Card key={payment.id} className="border-warning/30 hover:border-warning transition-all">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="font-mono text-xs text-warning">{payment.id}</div>
                              <div className="font-body text-sm text-muted-foreground">Match: {payment.matchId}</div>
                            </div>
                            <Badge className="bg-warning/20 text-warning border-warning font-mono">{payment.status.toUpperCase()}</Badge>
                          </div>

                          {match && (
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-4 w-4 text-success" />
                              <span className="font-semibold">₹{payment.amountPaid}</span>
                              <span className="text-muted-foreground">• {match.matchType}</span>
                            </div>
                          )}

                          <Separator />

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ImageIcon className="h-4 w-4" />
                              <span>Payment Screenshot</span>
                            </div>
                            <img
                              src={payment.screenshot.getDirectURL()}
                              alt="Payment screenshot"
                              className="w-full rounded border border-border hover:border-primary transition-colors cursor-pointer"
                              onClick={() => setFullScreenImage(payment.screenshot.getDirectURL())}
                            />
                          </div>

                          {payment.approved ? (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <Badge className="bg-success text-success-foreground font-mono flex items-center justify-center py-2">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                APPROVED
                              </Badge>
                              <Button
                                onClick={() => handleMarkAsRefunded(payment.id)}
                                disabled={markAsRefunded.isPending || payment.refunded}
                                variant="outline"
                                className="font-display"
                              >
                                {markAsRefunded.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : payment.refunded ? (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Refunded
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Mark Refunded
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <Button
                                onClick={() => handleConfirmPayment(payment.id)}
                                disabled={approvePayment.isPending}
                                className="bg-success hover:bg-success/90 text-success-foreground font-display"
                              >
                                {approvePayment.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Approve
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => handleRejectPayment(payment.id)}
                                disabled={rejectPayment.isPending}
                                variant="destructive"
                                className="font-display"
                              >
                                {rejectPayment.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl flex items-center gap-2">
            <UserCog className="h-6 w-6 text-primary" />
            User Management
          </CardTitle>
          <CardDescription>View, edit, and manage user accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search users by name, email, or player ID..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {userSearchQuery ? 'No users found matching your search' : 'No users registered yet'}
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Game Player ID</TableHead>
                    <TableHead>Game Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-semibold">{user.displayName}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {user.phoneNumber ? (
                          <a 
                            href={`https://wa.me/${user.phoneNumber.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success hover:underline font-semibold"
                            title="Click to open WhatsApp"
                          >
                            {user.phoneNumber}
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{user.gamePlayerId}</TableCell>
                      <TableCell>{user.gameName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Find the principal for this user
                              const userIndex = allUsers.indexOf(user);
                              if (userIndex >= 0) {
                                // We need to get principal from backend - for now show modal with available info
                                setSelectedUserPrincipal(user as any); // Store user object temporarily
                                setShowUserDetailsDialog(true);
                              }
                            }}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserPrincipal(user as any);
                              setShowUserEditDialog(true);
                            }}
                            title="Edit User"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUserPrincipal(user as any);
                              setShowUserDeleteDialog(true);
                            }}
                            title="Delete User"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Full Screen Image Viewer */}
      <Dialog open={!!fullScreenImage} onOpenChange={() => setFullScreenImage(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Payment Screenshot</DialogTitle>
          </DialogHeader>
          {fullScreenImage && (
            <div className="space-y-4">
              <img
                src={fullScreenImage}
                alt="Payment screenshot"
                className="w-full rounded border border-border"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(fullScreenImage, '_blank')}
              >
                Open in New Tab
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Match Participants Dialog */}
      <MatchParticipantsDialog 
        match={selectedMatchForParticipants}
        open={showParticipantsDialog}
        onOpenChange={setShowParticipantsDialog}
      />

      {/* User Details Dialog */}
      <Dialog open={showUserDetailsDialog} onOpenChange={setShowUserDetailsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <UserCog className="h-6 w-6 text-primary" />
              User Details
            </DialogTitle>
            <DialogDescription>Complete user profile information</DialogDescription>
          </DialogHeader>
          {selectedUserPrincipal && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Display Name:</span>
                  <span className="font-semibold">{(selectedUserPrincipal as any).displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="font-semibold">{(selectedUserPrincipal as any).email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone Number:</span>
                  <span className="font-semibold">
                    {(selectedUserPrincipal as any).phoneNumber ? (
                      <a 
                        href={`https://wa.me/${(selectedUserPrincipal as any).phoneNumber.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-success hover:underline"
                      >
                        {(selectedUserPrincipal as any).phoneNumber}
                      </a>
                    ) : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Game Player ID:</span>
                  <span className="font-mono text-sm">{(selectedUserPrincipal as any).gamePlayerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Game Name:</span>
                  <span className="font-semibold">{(selectedUserPrincipal as any).gameName}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Refund Payment QR Code</Label>
                <div className="border border-border rounded p-4 bg-card">
                  <img
                    src={(selectedUserPrincipal as any).refundPaymentQrCode?.getDirectURL?.() || ''}
                    alt="Refund QR Code"
                    className="w-full max-w-xs mx-auto rounded cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      const url = (selectedUserPrincipal as any).refundPaymentQrCode?.getDirectURL?.();
                      if (url) window.open(url, '_blank');
                    }}
                  />
                  <p className="text-xs text-muted-foreground text-center mt-2">Click to open in new tab</p>
                </div>
              </div>

              <Button onClick={() => setShowUserDetailsDialog(false)} className="w-full font-display">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* User Edit Dialog */}
      <UserEditDialog 
        user={selectedUserPrincipal as any}
        open={showUserEditDialog}
        onOpenChange={setShowUserEditDialog}
      />

      {/* User Delete Confirmation Dialog */}
      <Dialog open={showUserDeleteDialog} onOpenChange={setShowUserDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2 text-destructive">
              <Trash2 className="h-6 w-6" />
              Delete User
            </DialogTitle>
            <DialogDescription>This action cannot be undone</DialogDescription>
          </DialogHeader>
          {selectedUserPrincipal && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/30 p-4 rounded space-y-2">
                <p className="text-sm font-semibold">You are about to delete:</p>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Name:</span> {(selectedUserPrincipal as any).displayName}</p>
                  <p><span className="text-muted-foreground">Email:</span> {(selectedUserPrincipal as any).email}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This will permanently delete the user account and all associated data. This action cannot be reversed.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setShowUserDeleteDialog(false)} className="font-display">
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    // Note: Backend expects Principal, but we only have UserProfile
                    // This is a limitation - we need to track user principals
                    toast.error('Delete functionality requires user principal mapping');
                    setShowUserDeleteDialog(false);
                  }}
                  className="font-display"
                >
                  Delete User
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Match Participants Dialog Component
function MatchParticipantsDialog({ 
  match, 
  open, 
  onOpenChange 
}: { 
  match: Match | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { data: participants = [] } = useGetMatchParticipants(match?.id || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Match Participants</DialogTitle>
          <DialogDescription>
            {match && `${match.matchType} - ${match.id}`}
          </DialogDescription>
        </DialogHeader>
        
        {match && (
          <div className="space-y-4">
              <div className="bg-muted p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Match Type:</span>
                  <span className="font-display font-bold">1v1 Solo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Start Time:</span>
                  <span className="font-semibold">
                    {new Date(Number(match.startTime) / 1000000).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Entry Fee:</span>
                  <span className="font-semibold text-success">₹{match.entryFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Participants:</span>
                  <span className="font-semibold">{participants.length}</span>
                </div>
              </div>

            {participants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No participants yet
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Principal ID</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Game Player ID</TableHead>
                      <TableHead>Game Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((principal, index) => (
                      <ParticipantRow key={index} principal={principal} />
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Participant Row Component
function ParticipantRow({ principal }: { principal: Principal }) {
  const { data: profile, isLoading } = useGetUserProfile(principal);

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="text-center">
          <Loader2 className="h-4 w-4 animate-spin inline" />
        </TableCell>
      </TableRow>
    );
  }

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for WhatsApp link display
    const cleaned = phone.replace(/\D/g, '');
    return phone;
  };

  const getWhatsAppLink = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return `https://wa.me/${cleaned}`;
  };

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">{principal.toString().slice(0, 20)}...</TableCell>
      <TableCell>{profile?.displayName || '-'}</TableCell>
      <TableCell>
        {profile?.phoneNumber ? (
          <a 
            href={getWhatsAppLink(profile.phoneNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-success hover:underline font-semibold"
            title="Click to open WhatsApp"
          >
            {formatPhoneNumber(profile.phoneNumber)}
          </a>
        ) : (
          '-'
        )}
      </TableCell>
      <TableCell className="font-mono text-sm">{profile?.gamePlayerId || '-'}</TableCell>
      <TableCell>{profile?.gameName || '-'}</TableCell>
    </TableRow>
  );
}

// User Edit Dialog Component
function UserEditDialog({ 
  user, 
  open, 
  onOpenChange 
}: { 
  user: UserProfile | null; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const updateUserProfile = useUpdateUserProfile();
  const [editForm, setEditForm] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    gamePlayerId: '',
    gameName: '',
  });
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setEditForm({
        displayName: user.displayName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        gamePlayerId: user.gamePlayerId || '',
        gameName: user.gameName || '',
      });
    }
  }, [user]);

  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setQrFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      // Note: This requires knowing the user's Principal, which we don't have from getAllUsers
      // The backend getAllUsers returns UserProfile[] without principals
      // This is a limitation that needs backend API enhancement
      
      toast.error('Edit functionality requires API enhancement to return user principals');
      
      // Ideal code would be:
      // let updatedProfile = {
      //   ...editForm,
      //   refundPaymentQrCode: user.refundPaymentQrCode
      // };
      //
      // if (qrFile) {
      //   const arrayBuffer = await qrFile.arrayBuffer();
      //   const uint8Array = new Uint8Array(arrayBuffer);
      //   updatedProfile.refundPaymentQrCode = ExternalBlob.fromBytes(uint8Array);
      // }
      //
      // await updateUserProfile.mutateAsync({
      //   user: userPrincipal,
      //   profile: updatedProfile
      // });
      //
      // toast.success('User profile updated');
      // onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update user profile');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit User Profile
          </DialogTitle>
          <DialogDescription>Update user information</DialogDescription>
        </DialogHeader>
        
        {user && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-displayName">Display Name</Label>
              <Input
                id="edit-displayName"
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-phoneNumber">Phone Number</Label>
              <Input
                id="edit-phoneNumber"
                type="tel"
                value={editForm.phoneNumber}
                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-gamePlayerId">Game Player ID</Label>
              <Input
                id="edit-gamePlayerId"
                value={editForm.gamePlayerId}
                onChange={(e) => setEditForm({ ...editForm, gamePlayerId: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-gameName">Game Name</Label>
              <Input
                id="edit-gameName"
                value={editForm.gameName}
                onChange={(e) => setEditForm({ ...editForm, gameName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-qr">Refund Payment QR Code (Optional)</Label>
              <Input
                id="edit-qr"
                type="file"
                accept="image/*"
                onChange={handleQrFileChange}
                className="cursor-pointer"
              />
              <p className="text-xs text-muted-foreground">Leave empty to keep existing QR code</p>
              {(qrPreview || user.refundPaymentQrCode) && (
                <img
                  src={qrPreview || user.refundPaymentQrCode?.getDirectURL?.() || ''}
                  alt="QR Preview"
                  className="w-32 h-32 object-cover rounded border border-border mt-2"
                />
              )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="font-mono text-primary">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="font-display"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateUserProfile.isPending}
                className="font-display"
              >
                {updateUserProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
