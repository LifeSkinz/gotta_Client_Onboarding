import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Globe, 
  Linkedin, 
  Twitter, 
  Instagram, 
  Youtube,
  DollarSign,
  Clock,
  MapPin,
  Star,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Upload,
  X
} from 'lucide-react';

interface InvitationData {
  is_valid: boolean;
  email: string;
  expires_at: string;
  used_at: string | null;
}

interface CoachFormData {
  // Account
  email: string;
  password: string;
  confirmPassword: string;
  
  // Professional Details
  name: string;
  title: string;
  bio: string;
  years_experience: number;
  avatar_url?: string;
  
  // Expertise
  specialties: string[];
  coaching_expertise: string;
  coaching_style: string;
  client_challenge_example: string;
  personal_experiences: string;
  similar_experiences: string[];
  
  // Rates & Availability
  hourly_rate_amount: number;
  hourly_rate_currency: string;
  hourly_coin_cost: number;
  min_session_duration: number;
  max_session_duration: number;
  booking_buffer_minutes: number;
  
  // Contact & Links
  notification_email: string;
  notification_phone: string;
  social_links: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    other?: string[];
  };
  
  // Availability
  availability_hours: string;
  timezone: string;
  immediate_availability: boolean;
  response_preference_minutes: number;
}

const STEPS = [
  { id: 1, title: 'Account Setup', description: 'Create your login credentials' },
  { id: 2, title: 'Professional Details', description: 'Tell us about yourself' },
  { id: 3, title: 'Expertise & Experience', description: 'Share your coaching background' },
  { id: 4, title: 'Rates & Availability', description: 'Set your pricing and schedule' },
  { id: 5, title: 'Contact & Links', description: 'Add your contact information' },
  { id: 6, title: 'Review & Submit', description: 'Review your profile and submit' }
];

const COMMON_SPECIALTIES = [
  'Life Coaching', 'Career Coaching', 'Executive Coaching', 'Relationship Coaching',
  'Health & Wellness', 'Business Coaching', 'Leadership Development', 'Personal Development',
  'Mindfulness & Meditation', 'Stress Management', 'Goal Setting', 'Time Management',
  'Communication Skills', 'Confidence Building', 'Work-Life Balance', 'Spiritual Coaching'
];

const TIMEZONES = [
  'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00',
  'UTC-06:00', 'UTC-05:00', 'UTC-04:00', 'UTC-03:00', 'UTC-02:00', 'UTC-01:00',
  'UTC+00:00', 'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+04:00', 'UTC+05:00',
  'UTC+06:00', 'UTC+07:00', 'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'
];

export default function CoachOnboardingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [validatingToken, setValidatingToken] = useState(true);
  
  const [formData, setFormData] = useState<CoachFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    title: '',
    bio: '',
    years_experience: 1,
    specialties: [],
    coaching_expertise: '',
    coaching_style: '',
    client_challenge_example: '',
    personal_experiences: '',
    similar_experiences: [],
    hourly_rate_amount: 100,
    hourly_rate_currency: 'USD',
    hourly_coin_cost: 10,
    min_session_duration: 30,
    max_session_duration: 120,
    booking_buffer_minutes: 15,
    notification_email: '',
    notification_phone: '',
    social_links: {},
    availability_hours: '9 AM - 6 PM',
    timezone: 'UTC+00:00',
    immediate_availability: true,
    response_preference_minutes: 60
  });

  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      validateInvitationToken();
    } else {
      setValidatingToken(false);
      toast({
        title: "Invalid Invitation",
        description: "No invitation token provided.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [token]);

  const validateInvitationToken = async () => {
    try {
      const { data, error } = await supabase.rpc('validate_invitation_token', {
        _token: token
      }) as { data: InvitationData | null; error: any };

      if (error) {
        console.error('Error validating token:', error);
        toast({
          title: "Invalid Invitation",
          description: "Failed to validate invitation token.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      if (data) {
        const invitation = data;
        setInvitationData(invitation);
        setFormData(prev => ({ ...prev, email: invitation.email }));
        
        if (!invitation.is_valid) {
          toast({
            title: "Invalid Invitation",
            description: invitation.used_at ? "This invitation has already been used." : "This invitation has expired.",
            variant: "destructive"
          });
          navigate('/');
        }
      } else {
        toast({
          title: "Invalid Invitation",
          description: "Invitation token not found.",
          variant: "destructive"
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Error validating invitation:', error);
      toast({
        title: "Error",
        description: "Failed to validate invitation.",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setValidatingToken(false);
    }
  };

  const handleInputChange = (field: keyof CoachFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSpecialtyToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleSimilarExperienceToggle = (experience: string) => {
    setFormData(prev => ({
      ...prev,
      similar_experiences: prev.similar_experiences.includes(experience)
        ? prev.similar_experiences.filter(s => s !== experience)
        : [...prev.similar_experiences, experience]
    }));
  };

  const addCustomSpecialty = (specialty: string) => {
    if (specialty.trim() && !formData.specialties.includes(specialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty.trim()]
      }));
    }
  };

  const removeSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Password Mismatch",
          description: "Passwords do not match. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!formData.name || !formData.password || !token) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Call the complete-coach-onboarding edge function
      const { data, error } = await supabase.functions.invoke('complete-coach-onboarding', {
        body: {
          token,
          password: formData.password,
          name: formData.name,
          title: formData.title,
          bio: formData.bio,
          specialties: formData.specialties,
          hourlyRate: formData.hourly_rate_amount,
          notificationEmail: formData.notification_email || formData.email,
        },
      });

      if (error) throw error;

      toast({
        title: "Welcome to the Platform!",
        description: `Your coach profile has been created successfully!`,
      });

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        toast({
          title: "Please Sign In",
          description: "Your account was created. Please sign in to continue.",
        });
        navigate('/auth');
      } else {
        navigate('/coach-dashboard');
      }

    } catch (error: any) {
      console.error('Error creating coach profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create coach profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  This email is from your invitation and cannot be changed.
                </p>
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Create a strong password"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <Label htmlFor="title">Professional Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Certified Life Coach"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell us about your background, experience, and what makes you unique as a coach..."
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="years_experience">Years of Experience</Label>
              <Input
                id="years_experience"
                type="number"
                min="0"
                max="50"
                value={formData.years_experience}
                onChange={(e) => handleInputChange('years_experience', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>Coaching Specialties</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COMMON_SPECIALTIES.map((specialty) => (
                  <Badge
                    key={specialty}
                    variant={formData.specialties.includes(specialty) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleSpecialtyToggle(specialty)}
                  >
                    {specialty}
                  </Badge>
                ))}
              </div>
              <div className="mt-4">
                <Input
                  placeholder="Add custom specialty..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addCustomSpecialty(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
              </div>
              {formData.specialties.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Selected Specialties:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary" className="flex items-center gap-1">
                        {specialty}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeSpecialty(specialty)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="coaching_expertise">Coaching Expertise</Label>
              <Textarea
                id="coaching_expertise"
                value={formData.coaching_expertise}
                onChange={(e) => handleInputChange('coaching_expertise', e.target.value)}
                placeholder="Describe your specific areas of expertise and certifications..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="coaching_style">Coaching Style</Label>
              <Textarea
                id="coaching_style"
                value={formData.coaching_style}
                onChange={(e) => handleInputChange('coaching_style', e.target.value)}
                placeholder="How would you describe your coaching approach and methodology?"
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourly_rate_amount">Hourly Rate (USD)</Label>
                <Input
                  id="hourly_rate_amount"
                  type="number"
                  min="0"
                  step="5"
                  value={formData.hourly_rate_amount}
                  onChange={(e) => handleInputChange('hourly_rate_amount', parseFloat(e.target.value) || 0)}
                />
              </div>
              
              <div>
                <Label htmlFor="hourly_coin_cost">Coin Cost per Hour</Label>
                <Input
                  id="hourly_coin_cost"
                  type="number"
                  min="0"
                  value={formData.hourly_coin_cost}
                  onChange={(e) => handleInputChange('hourly_coin_cost', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min_session_duration">Minimum Session Duration (minutes)</Label>
                <Input
                  id="min_session_duration"
                  type="number"
                  min="15"
                  step="15"
                  value={formData.min_session_duration}
                  onChange={(e) => handleInputChange('min_session_duration', parseInt(e.target.value) || 30)}
                />
              </div>
              
              <div>
                <Label htmlFor="max_session_duration">Maximum Session Duration (minutes)</Label>
                <Input
                  id="max_session_duration"
                  type="number"
                  min="30"
                  step="15"
                  value={formData.max_session_duration}
                  onChange={(e) => handleInputChange('max_session_duration', parseInt(e.target.value) || 120)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="notification_email">Notification Email</Label>
                <Input
                  id="notification_email"
                  type="email"
                  value={formData.notification_email}
                  onChange={(e) => handleInputChange('notification_email', e.target.value)}
                  placeholder="coach@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="notification_phone">Phone Number</Label>
                <Input
                  id="notification_phone"
                  type="tel"
                  value={formData.notification_phone}
                  onChange={(e) => handleInputChange('notification_phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.social_links.website || ''}
                onChange={(e) => handleInputChange('social_links', { ...formData.social_links, website: e.target.value })}
                placeholder="https://your-website.com"
              />
            </div>
            
            <div>
              <Label htmlFor="linkedin">LinkedIn Profile</Label>
              <Input
                id="linkedin"
                type="url"
                value={formData.social_links.linkedin || ''}
                onChange={(e) => handleInputChange('social_links', { ...formData.social_links, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Ready to Submit!</h3>
              </div>
              <p className="text-green-700 text-sm mt-1">
                Please review your information below and click submit to create your coach profile.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Professional Details</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {formData.name}</p>
                  <p><strong>Title:</strong> {formData.title}</p>
                  <p><strong>Experience:</strong> {formData.years_experience} years</p>
                  <p><strong>Specialties:</strong> {formData.specialties.join(', ')}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Rates & Availability</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Hourly Rate:</strong> ${formData.hourly_rate_amount} ({formData.hourly_coin_cost} coins)</p>
                  <p><strong>Session Duration:</strong> {formData.min_session_duration} - {formData.max_session_duration} minutes</p>
                  <p><strong>Timezone:</strong> {formData.timezone}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (!invitationData?.is_valid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Coach Onboarding</h1>
          <p className="text-gray-600 mt-2">Complete your coach profile to start accepting sessions</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {STEPS.length}</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / STEPS.length) * 100)}% Complete</span>
          </div>
          <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Steps Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {STEPS.map((step) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      currentStep === step.id
                        ? 'bg-primary text-primary-foreground'
                        : currentStep > step.id
                        ? 'bg-green-50 text-green-700'
                        : 'bg-gray-50 text-gray-600'
                    }`}
                    onClick={() => setCurrentStep(step.id)}
                  >
                    <div className="flex items-center gap-2">
                      {currentStep > step.id ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-xs">
                          {step.id}
                        </span>
                      )}
                      <div>
                        <p className="font-medium text-sm">{step.title}</p>
                        <p className="text-xs opacity-75">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderStep()}
                
                <Separator className="my-6" />
                
                {/* Navigation Buttons */}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  {currentStep < STEPS.length ? (
                    <Button onClick={nextStep}>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Profile...
                        </>
                      ) : (
                        'Submit Profile'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
