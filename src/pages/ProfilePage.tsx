import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Settings, Bell, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppNavigation } from "@/components/AppNavigation";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  bio?: string;
  phone?: string;
  notification_method: string;
  email_verified: boolean;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create a default profile if none exists
        const newProfile = {
          user_id: userId,
          full_name: user?.user_metadata?.full_name || '',
          notification_method: 'email',
          email_verified: false
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) throw createError;
        setProfile(createdProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          phone: profile.phone,
          notification_method: profile.notification_method
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile changes.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTranscripts = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('session_recordings')
        .update({ transcript: null })
        .eq('session_id', user.id);

      if (error) throw error;

      toast({
        title: "Transcripts Deleted",
        description: "All your session transcripts have been deleted.",
      });
    } catch (error) {
      console.error('Error deleting transcripts:', error);
      toast({
        title: "Error",
        description: "Failed to delete transcripts.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <>
        <AppNavigation user={user} />
        <div className="pt-20 lg:pt-24 container max-w-4xl mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AppNavigation user={user} />
        <div className="pt-20 lg:pt-24 container max-w-4xl mx-auto py-8">
          <Card>
            <CardContent className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Sign in required</h3>
              <p className="text-muted-foreground">
                Please sign in to view your profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppNavigation user={user} />
      <div className="pt-20 lg:pt-24 container max-w-4xl mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile & Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal information, preferences, and privacy settings
          </p>
        </div>

        <div className="grid gap-6">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile?.full_name || ''}
                    onChange={(e) => setProfile(prev => prev ? {...prev, full_name: e.target.value} : null)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={user.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={profile?.phone || ''}
                  onChange={(e) => setProfile(prev => prev ? {...prev, phone: e.target.value} : null)}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile?.bio || ''}
                  onChange={(e) => setProfile(prev => prev ? {...prev, bio: e.target.value} : null)}
                  placeholder="Tell us a bit about yourself..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose how you'd like to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notificationMethod">Preferred Notification Method</Label>
                <select
                  id="notificationMethod"
                  value={profile?.notification_method || 'email'}
                  onChange={(e) => setProfile(prev => prev ? {...prev, notification_method: e.target.value} : null)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="both">Email & SMS</option>
                  <option value="none">None</option>
                </select>
              </div>
              
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Update Preferences"}
              </Button>
            </CardContent>
          </Card>

          {/* Privacy & Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Privacy & Data Management
              </CardTitle>
              <CardDescription>
                Control your data and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Session Transcripts</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Delete all your session transcripts. Note: This will reduce the platform's ability to provide personalized insights.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleDeleteTranscripts}
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Transcripts
                </Button>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Account Status</h4>
                <div className="text-sm space-y-1">
                  <p>Email Status: {profile?.email_verified ? '✅ Verified' : '❌ Not Verified'}</p>
                  <p>Account Created: {new Date(user.created_at).toLocaleDateString()}</p>
                  <p>Last Sign In: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}