import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile, useIsCallerAdmin, useSaveCallerUserProfile } from './hooks/useQueries';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Loader2, LogOut, User, Upload, X } from 'lucide-react';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalBlob } from './backend';

export default function App() {
  const { identity, login, clear, loginStatus } = useInternetIdentity();
  const queryClient = useQueryClient();
  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === 'logging-in';

  const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();
  const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();
  const saveProfile = useSaveCallerUserProfile();

  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    displayName: '', 
    email: '', 
    phoneNumber: '',
    gamePlayerId: '', 
    gameName: '',
    refundQrFile: null as File | null
  });
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (isAuthenticated && !profileLoading && isFetched && userProfile === null) {
      setShowProfileSetup(true);
    }
  }, [isAuthenticated, profileLoading, isFetched, userProfile]);

  const handleLogin = async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message === 'User is already authenticated') {
        await clear();
        setTimeout(() => login(), 300);
      }
    }
  };

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
    toast.success('Logged out successfully');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.displayName.trim() || !profileForm.email.trim() || 
        !profileForm.phoneNumber.trim() || !profileForm.gamePlayerId.trim() || 
        !profileForm.gameName.trim() || !profileForm.refundQrFile) {
      toast.error('Please fill in all fields and upload refund QR code');
      return;
    }

    try {
      // Convert QR code image to ExternalBlob
      const arrayBuffer = await profileForm.refundQrFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const qrBlob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      await saveProfile.mutateAsync({
        displayName: profileForm.displayName,
        email: profileForm.email,
        phoneNumber: profileForm.phoneNumber,
        gamePlayerId: profileForm.gamePlayerId,
        gameName: profileForm.gameName,
        refundPaymentQrCode: qrBlob
      });
      setShowProfileSetup(false);
      setQrPreview(null);
      setUploadProgress(0);
      toast.success('Profile created successfully');
    } catch (error) {
      toast.error('Failed to create profile');
      setUploadProgress(0);
    }
  };

  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setProfileForm({ ...profileForm, refundQrFile: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Landing page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Toaster />
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6 flex justify-between items-center">
            <h1 className="text-3xl font-display font-bold tracking-tight text-primary">ACE8WIN</h1>
            <Button onClick={handleLogin} disabled={isLoggingIn} className="font-display">
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Login'
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-4xl w-full text-center space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h2 className="text-6xl md:text-7xl font-display font-bold tracking-tighter text-foreground">
                COMPETITIVE
                <br />
                <span className="text-primary neon-glow">GAMING</span>
                <br />
                MATCHMAKING
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-body">
                Join high-stakes 1v1 matches. Pay to play. Prove your skills.
              </p>
            </div>

            <div className="flex justify-center mt-12">
              <div className="bg-card border border-border p-8 space-y-3 hover:border-primary transition-colors max-w-sm w-full">
                <div className="text-6xl font-display font-bold text-primary text-center">1v1</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider text-center">Solo Duels</div>
                <p className="text-xs text-muted-foreground text-center pt-2">Head-to-head competitive gaming</p>
              </div>
            </div>

            <Button onClick={handleLogin} disabled={isLoggingIn} size="lg" className="text-lg font-display mt-8">
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Enter Arena'
              )}
            </Button>
          </div>
        </main>

        <footer className="border-t border-border py-6 bg-card">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            © 2026. Built with love using{' '}
            <a href="https://caffeine.ai" className="text-primary hover:underline">
              caffeine.ai
            </a>
          </div>
        </footer>
      </div>
    );
  }

  // Profile setup dialog
  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-background">
        <Toaster />
        <Dialog open={showProfileSetup} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Welcome to ACE8WIN</DialogTitle>
              <DialogDescription>Set up your profile to get started</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name *</Label>
                <Input
                  id="displayName"
                  placeholder="Enter your name"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">Admin will contact you via WhatsApp</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gamePlayerId">Game Player ID *</Label>
                <Input
                  id="gamePlayerId"
                  placeholder="Your in-game player ID"
                  value={profileForm.gamePlayerId}
                  onChange={(e) => setProfileForm({ ...profileForm, gamePlayerId: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gameName">Game Name *</Label>
                <Input
                  id="gameName"
                  placeholder="e.g., BGMI, Free Fire, COD"
                  value={profileForm.gameName}
                  onChange={(e) => setProfileForm({ ...profileForm, gameName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refundQr">Refund Payment QR Code *</Label>
                <Input
                  id="refundQr"
                  type="file"
                  accept="image/*"
                  onChange={handleQrFileChange}
                  required
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">Upload your UPI QR code for refund processing</p>
                {qrPreview && (
                  <div className="relative mt-2 inline-block">
                    <img src={qrPreview} alt="QR Preview" className="w-32 h-32 object-cover rounded border border-border" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={() => {
                        setQrPreview(null);
                        setProfileForm({ ...profileForm, refundQrFile: null });
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
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
              <Button type="submit" className="w-full font-display" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Profile'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Loading state
  if (profileLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Main app with header and role-based dashboard
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster />
      
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-display font-bold tracking-tight text-primary">ACE8WIN</h1>
          
          <div className="flex items-center gap-4">
            {userProfile && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-body">{userProfile.displayName}</span>
                {isAdmin && (
                  <span className="px-2 py-1 text-xs font-mono bg-primary/20 text-primary border border-primary rounded">
                    ADMIN
                  </span>
                )}
              </div>
            )}
            <Button onClick={handleLogout} variant="outline" size="sm" className="font-display">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {isAdmin ? <AdminDashboard /> : <UserDashboard />}
      </main>

      <footer className="border-t border-border py-4 bg-card">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026. Built with love using{' '}
          <a href="https://caffeine.ai" className="text-primary hover:underline">
            caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
