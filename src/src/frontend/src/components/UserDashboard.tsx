import { useState, useEffect } from 'react';
import { useGetAllMatches, useGetUserMatches, useJoinMatch, useSubmitPayment, useGetPaymentStatus, useBookAllSlots, useGetUserTransactionHistory } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Users, DollarSign, Upload, Loader2, CheckCircle, XCircle, Clock, Gamepad2, AlertCircle, Eye, Receipt } from 'lucide-react';
import type { Match } from '../backend.d.ts';
import { ExternalBlob } from '../backend';

export default function UserDashboard() {
  const { data: allMatches = [], isLoading: allMatchesLoading } = useGetAllMatches();
  const { data: userMatches = [], isLoading: userMatchesLoading } = useGetUserMatches();
  const { data: transactionHistory = [], isLoading: transactionsLoading } = useGetUserTransactionHistory();
  const joinMatch = useJoinMatch();
  const submitPayment = useSubmitPayment();
  const bookAllSlots = useBookAllSlots();

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [showBookAllDialog, setShowBookAllDialog] = useState(false);
  const [alreadyJoinedMatch, setAlreadyJoinedMatch] = useState<Match | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // Generate UPI deep link
  const upiLink = selectedMatch && paymentAmount > 0 
    ? `upi://pay?pa=ace8zonereal@ptyes&am=${paymentAmount}&cu=INR`
    : '';

  const getMatchTypeMaxParticipants = (matchType: string) => {
    return 2; // 1v1 only
  };

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

  const handleJoinMatch = async (match: Match) => {
    const maxParticipants = getMatchTypeMaxParticipants(match.matchType);
    if (match.participants.length >= maxParticipants) {
      toast.error('Match is full');
      return;
    }

    // Check if user already joined this match
    const alreadyJoined = userMatches.find(m => m.id === match.id);
    if (alreadyJoined) {
      setAlreadyJoinedMatch(alreadyJoined);
      setShowWarningDialog(true);
      return;
    }

    try {
      await joinMatch.mutateAsync(match.id);
      setSelectedMatch(match);
      setPaymentAmount(match.entryFee);
      setShowPaymentDialog(true);
      toast.success('Joined match! Please submit payment.');
    } catch (error) {
      toast.error('Failed to join match');
    }
  };

  const handleBookAllSlots = async () => {
    if (!selectedMatch) return;
    
    try {
      await bookAllSlots.mutateAsync(selectedMatch.id);
      setShowBookAllDialog(false);
      const totalAmount = selectedMatch.entryFee * getMatchTypeMaxParticipants(selectedMatch.matchType);
      setPaymentAmount(totalAmount);
      setShowPaymentDialog(true);
      toast.success('All slots booked! Please submit payment.');
    } catch (error) {
      toast.error('Failed to book all slots');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !selectedMatch) {
      toast.error('Please select a payment screenshot');
      return;
    }

    if (!paymentAmount || paymentAmount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      await submitPayment.mutateAsync({
        matchId: selectedMatch.id,
        screenshot: blob,
        amountPaid: paymentAmount,
      });

      toast.success('Payment submitted for review');
      setShowPaymentDialog(false);
      setSelectedFile(null);
      setSelectedMatch(null);
      setUploadProgress(0);
      setPaymentAmount(0);
    } catch (error) {
      toast.error('Failed to submit payment');
      setUploadProgress(0);
    }
  };

  const availableMatches = allMatches.filter((match) => {
    const maxParticipants = getMatchTypeMaxParticipants(match.matchType);
    return match.status === 'open' && match.participants.length < maxParticipants;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
          <TabsTrigger value="browse" className="font-display">Browse Matches</TabsTrigger>
          <TabsTrigger value="my-matches" className="font-display">My Matches</TabsTrigger>
          <TabsTrigger value="transactions" className="font-display">Transaction History</TabsTrigger>
        </TabsList>

        {/* Browse Available Matches */}
        <TabsContent value="browse" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-display font-bold tracking-tight">
              <span className="text-primary">AVAILABLE</span> MATCHES
            </h2>
            <p className="text-muted-foreground">Join a match and submit payment to secure your slot</p>
          </div>

          {allMatchesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : availableMatches.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Gamepad2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No matches available at the moment</p>
                <p className="text-sm text-muted-foreground mt-2">Check back soon for new matches</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableMatches.map((match) => {
                const maxParticipants = getMatchTypeMaxParticipants(match.matchType);
                const slotsLeft = maxParticipants - match.participants.length;
                
                return (
                  <Card
                    key={match.id}
                    className="border-border hover:border-primary transition-all hover:shadow-neon group cursor-pointer"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="font-display text-3xl font-bold">1v1</CardTitle>
                        {getStatusBadge(match)}
                      </div>
                      <div className="font-mono text-xs text-primary">{match.id}</div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 text-warning" />
                            <span>Start Time</span>
                          </div>
                          <span className="font-semibold text-sm">
                            {new Date(Number(match.startTime) / 1000000).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4 text-success" />
                            <span>Entry Fee</span>
                          </div>
                          <span className="font-display text-xl font-bold text-success">₹{match.entryFee}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4 text-primary" />
                            <span>Slots</span>
                          </div>
                          <span className="font-semibold">
                            {match.participants.length}/{maxParticipants}
                            <span className="text-muted-foreground text-sm ml-1">
                              ({slotsLeft} left)
                            </span>
                          </span>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          onClick={() => handleJoinMatch(match)}
                          disabled={joinMatch.isPending}
                          className="font-display group-hover:shadow-neon"
                        >
                          {joinMatch.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Joining...
                            </>
                          ) : (
                            'Join Match'
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedMatch(match);
                            setShowBookAllDialog(true);
                          }}
                          disabled={bookAllSlots.isPending}
                          variant="outline"
                          className="font-display"
                        >
                          {bookAllSlots.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Book All'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* My Matches */}
        <TabsContent value="my-matches" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-display font-bold tracking-tight">
              MY <span className="text-primary">MATCHES</span>
            </h2>
            <p className="text-muted-foreground">Track your joined matches and payment status</p>
          </div>

          {userMatchesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : userMatches.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">You haven't joined any matches yet</p>
                <p className="text-sm text-muted-foreground mt-2">Browse available matches to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {userMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Transaction History */}
        <TabsContent value="transactions" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-display font-bold tracking-tight">
              TRANSACTION <span className="text-primary">HISTORY</span>
            </h2>
            <p className="text-muted-foreground">View all your payments and refunds</p>
          </div>

          {transactionsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : transactionHistory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground mt-2">Your payment history will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Match ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Refund</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Screenshot</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionHistory.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">{payment.matchId}</TableCell>
                          <TableCell className="font-semibold text-success">₹{payment.amountPaid}</TableCell>
                          <TableCell>
                            {payment.approved ? (
                              <Badge className="bg-success text-success-foreground font-mono">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                APPROVED
                              </Badge>
                            ) : payment.status === 'rejected' ? (
                              <Badge variant="destructive" className="font-mono">
                                <XCircle className="mr-1 h-3 w-3" />
                                REJECTED
                              </Badge>
                            ) : (
                              <Badge className="bg-warning text-warning-foreground font-mono">
                                <Clock className="mr-1 h-3 w-3" />
                                PENDING
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {payment.refunded ? (
                              <div className="space-y-1">
                                <Badge className="bg-primary text-primary-foreground font-mono">REFUNDED</Badge>
                                {payment.refundTimestamp && (
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(Number(payment.refundTimestamp) / 1000000).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(Number(payment.timestamp) / 1000000).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFullScreenImage(payment.screenshot.getDirectURL())}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Warning Dialog for Already Joined */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-warning" />
              Already Joined
            </DialogTitle>
            <DialogDescription>You have already joined this match</DialogDescription>
          </DialogHeader>
          {alreadyJoinedMatch && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Match:</span>
                  <span className="font-display font-bold">{alreadyJoinedMatch.matchType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Match ID:</span>
                  <span className="font-mono text-xs text-primary">{alreadyJoinedMatch.id}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Check your payment status in the "My Matches" tab
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setShowWarningDialog(false)} className="w-full font-display">
                  OK
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Book All Slots Confirmation */}
      <Dialog open={showBookAllDialog} onOpenChange={setShowBookAllDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Book All Slots</DialogTitle>
            <DialogDescription>Book the entire match for yourself</DialogDescription>
          </DialogHeader>
          {selectedMatch && (
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 p-4 rounded space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Match Type:</span>
                  <span className="font-display font-bold">1v1 Solo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Slots:</span>
                  <span className="font-semibold">{getMatchTypeMaxParticipants(selectedMatch.matchType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Entry Fee per Slot:</span>
                  <span className="font-semibold text-success">₹{selectedMatch.entryFee}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-display font-bold">Total Cost:</span>
                  <span className="font-display text-2xl font-bold text-success">
                    ₹{selectedMatch.entryFee * getMatchTypeMaxParticipants(selectedMatch.matchType)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                By booking all slots, you will have exclusive access to this match. You will need to pay for all slots.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setShowBookAllDialog(false)} className="font-display">
                  Cancel
                </Button>
                <Button onClick={handleBookAllSlots} disabled={bookAllSlots.isPending} className="font-display">
                  {bookAllSlots.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

      {/* Payment Submission Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Submit Payment</DialogTitle>
            <DialogDescription>Scan the QR code or pay manually, then upload your payment screenshot</DialogDescription>
          </DialogHeader>

          {selectedMatch && (
            <div className="space-y-6">
              {/* Match Details */}
              <div className="bg-muted p-4 rounded space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Match Type</span>
                  <span className="font-display font-bold">1v1 Solo</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Start Time</span>
                  <span className="font-semibold text-sm">
                    {new Date(Number(selectedMatch.startTime) / 1000000).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Entry Fee</span>
                  <span className="font-display text-xl font-bold text-success">₹{selectedMatch.entryFee}</span>
                </div>
              </div>

              {/* UPI Payment Section */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-4">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <h3 className="font-display font-bold text-lg">UPI Payment</h3>
                  </div>

                  {/* UPI ID Display */}
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-muted-foreground">Scan with your UPI app or pay manually</p>
                    
                    {upiLink && (
                      <a 
                        href={upiLink}
                        className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-display font-bold hover:bg-primary/90 transition-colors"
                      >
                        Pay ₹{paymentAmount} via UPI
                      </a>
                    )}

                    <div className="bg-background border border-primary/30 rounded-lg px-4 py-3 mt-4">
                      <p className="text-xs text-muted-foreground mb-1">UPI ID:</p>
                      <p className="font-mono font-bold text-lg tracking-tight text-primary">
                        ace8zonereal@ptyes
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-2 text-success">
                      <DollarSign className="h-6 w-6" />
                      <span className="font-display font-bold text-3xl">₹{paymentAmount}</span>
                    </div>
                  </div>

                   {/* Instructions */}
                   <div className="text-xs text-muted-foreground text-left bg-muted/50 p-3 rounded space-y-1.5 mt-4">
                     <p className="font-semibold text-foreground mb-2">Payment Steps:</p>
                     <p>1. Click "Pay via UPI" button above or manually send to <span className="font-mono text-primary">ace8zonereal@ptyes</span></p>
                     <p>2. Complete payment of ₹{paymentAmount} in your UPI app</p>
                     <p>3. After payment, take a screenshot of the confirmation</p>
                     <p>4. Upload the screenshot below for verification</p>
                   </div>
                </div>
              </div>

              <Separator />

              {/* Upload Screenshot Section */}
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-base font-semibold">
                    Amount Paid (INR) *
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount paid"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value))}
                    required
                    min="1"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pre-filled with {paymentAmount === selectedMatch.entryFee ? 'match entry fee' : 'total booking amount'}. Adjust if needed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screenshot" className="text-base font-semibold">
                    Upload Payment Screenshot *
                  </Label>
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    required
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-2 rounded">
                      <CheckCircle className="h-4 w-4" />
                      <span>Selected: {selectedFile.name}</span>
                    </div>
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

                <Button
                  type="submit"
                  className="w-full font-display"
                  disabled={submitPayment.isPending || !selectedFile}
                >
                  {submitPayment.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Submit Payment Proof
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component for match card with payment status
function MatchCard({ match }: { match: Match }) {
  const { data: paymentStatus } = useGetPaymentStatus(match.id);

  const getPaymentStatusBadge = () => {
    if (!paymentStatus) {
      return <Badge variant="secondary" className="font-mono">NO PAYMENT</Badge>;
    }

    switch (paymentStatus.status) {
      case 'pending':
        return (
          <Badge className="bg-warning text-warning-foreground font-mono">
            <Clock className="mr-1 h-3 w-3" />
            PENDING
          </Badge>
        );
      case 'confirmed':
        return (
          <Badge className="bg-success text-success-foreground font-mono">
            <CheckCircle className="mr-1 h-3 w-3" />
            CONFIRMED
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive" className="font-mono">
            <XCircle className="mr-1 h-3 w-3" />
            REJECTED
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="font-mono">{paymentStatus.status.toUpperCase()}</Badge>;
    }
  };

  const maxParticipants = 2; // 1v1 only

  return (
    <Card className="border-border hover:border-primary/50 transition-all">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <CardTitle className="font-display text-2xl font-bold">1v1 Solo</CardTitle>
          {getPaymentStatusBadge()}
        </div>
        <div className="font-mono text-xs text-primary">{match.id}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-warning" />
              <span>Start:</span>
            </div>
            <span className="font-semibold">
              {new Date(Number(match.startTime) / 1000000).toLocaleString('en-IN', {
                dateStyle: 'short',
                timeStyle: 'short'
              })}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4 text-success" />
              <span>Entry:</span>
            </div>
            <span className="font-semibold">₹{match.entryFee}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Players:</span>
            </div>
            <span className="font-semibold">{match.participants.length}/{maxParticipants}</span>
          </div>
        </div>

        {paymentStatus && paymentStatus.status === 'rejected' && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm text-destructive">
            Payment was rejected. Please resubmit with a valid payment screenshot.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
