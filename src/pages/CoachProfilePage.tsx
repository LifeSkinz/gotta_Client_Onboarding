import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Star, MapPin, Calendar, Clock, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ConnectConfirmDialog from "@/components/ConnectConfirmDialog";
import { SessionBookingFlow } from "@/components/SessionBookingFlow";
import { UserWallet } from "@/components/UserWallet";

interface Coach {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar_url?: string;
  rating?: number;
  total_reviews?: number;
  years_experience: number;
  specialties: string[];
  similar_experiences: string[];
  available_now?: boolean;
  social_links?: any;
  calendar_link?: string;
  coaching_expertise?: string;
  coaching_style?: string;
  client_challenge_example?: string;
  personal_experiences?: string;
}

interface CoachingPackage {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_amount: number;
  price_currency: string;
  coin_cost: number;
  features: string[];
  package_type: string;
}

export default function CoachProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [packages, setPackages] = useState<CoachingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [showBookingFlow, setShowBookingFlow] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchCoachData(id);
    }
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchCoachData = async (coachId: string) => {
    try {
      const [coachResponse, packagesResponse] = await Promise.all([
        supabase.from('coaches').select('*').eq('id', coachId).single(),
        supabase.from('coaching_packages').select('*').eq('coach_id', coachId).eq('is_active', true)
      ]);

      if (coachResponse.error) throw coachResponse.error;
      if (packagesResponse.error) throw packagesResponse.error;

      setCoach(coachResponse.data);
      setPackages(packagesResponse.data || []);
    } catch (error) {
      console.error('Error fetching coach data:', error);
      toast.error('Failed to load coach profile');
    } finally {
      setLoading(false);
    }
  };

  const openBookingFlow = () => {
    setShowBookingFlow(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold mb-2">Coach Not Found</h2>
            <p className="text-muted-foreground mb-4">The coach profile you're looking for doesn't exist.</p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/coaches')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Coaches
          </Button>
          {user && <UserWallet userId={user.id} />}
        </div>

        {/* Coach Profile Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="w-24 h-24 border-4 border-background">
                  <AvatarImage src={coach.avatar_url} alt={coach.name} />
                  <AvatarFallback className="text-lg font-semibold">
                    {coach.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold">{coach.name}</h1>
                    <p className="text-lg text-muted-foreground">{coach.title}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{coach.rating || 5.0}</span>
                      <span className="text-muted-foreground">({coach.total_reviews || 0} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{coach.years_experience}+ years experience</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${coach.available_now ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      <span>{coach.available_now ? 'Available Now' : 'Busy'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {coach.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary">{specialty}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => setShowConnectDialog(true)}
                    className="w-full"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Connect Now
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={openBookingFlow}
                    className="w-full"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Session
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Bio */}
              <div>
                <h3 className="text-lg font-semibold mb-2">About</h3>
                <p className="text-muted-foreground">{coach.bio}</p>
              </div>

              {/* Coaching Expertise */}
              {coach.coaching_expertise && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Coaching Expertise</h3>
                  <p className="text-muted-foreground">{coach.coaching_expertise}</p>
                </div>
              )}

              {/* Coaching Style */}
              {coach.coaching_style && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Coaching Style</h3>
                  <p className="text-muted-foreground">{coach.coaching_style}</p>
                </div>
              )}

              {/* Success Story */}
              {coach.client_challenge_example && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Success Story</h3>
                  <p className="text-muted-foreground">{coach.client_challenge_example}</p>
                </div>
              )}

              {/* Personal Journey */}
              {coach.personal_experiences && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Personal Journey</h3>
                  <p className="text-muted-foreground">{coach.personal_experiences}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Coaching Packages */}
        {packages.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Coaching Packages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold">{pkg.name}</h3>
                      <Badge variant="outline" className="mt-1">{pkg.package_type}</Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Duration:</span>
                        <span className="text-sm font-medium">{pkg.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Price:</span>
                        <span className="text-sm font-medium">{pkg.coin_cost} coins</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {pkg.features.map((feature, index) => (
                        <div key={index} className="text-xs text-muted-foreground flex items-center gap-1">
                          <div className="w-1 h-1 bg-primary rounded-full" />
                          {feature}
                        </div>
                      ))}
                    </div>

                    <Button size="sm" className="w-full">
                      Select Package
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConnectConfirmDialog
        isOpen={showConnectDialog}
        onClose={() => setShowConnectDialog(false)}
        coach={coach ? {
          id: coach.id,
          name: coach.name,
          title: coach.title,
          bio: coach.bio,
          avatar_url: coach.avatar_url,
          rating: coach.rating || 5.0,
          available_now: coach.available_now,
          specialties: coach.specialties
        } : null}
      />

      {coach && (
        <SessionBookingFlow
          isOpen={showBookingFlow}
          onClose={() => setShowBookingFlow(false)}
          coach={{
            id: coach.id,
            name: coach.name,
            hourly_rate_amount: 100, // Will be fetched from updated coach data
            hourly_coin_cost: 100,
            min_session_duration: 30,
            max_session_duration: 90,
            booking_buffer_minutes: 15
          }}
        />
      )}
    </div>
  );
}