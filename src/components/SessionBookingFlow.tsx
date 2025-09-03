import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, Video, DollarSign, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, setHours, setMinutes, isAfter, isBefore } from "date-fns";

interface Coach {
  id: string;
  name: string;
  hourly_rate_amount: number;
  hourly_coin_cost: number;
  min_session_duration: number;
  max_session_duration: number;
  booking_buffer_minutes: number;
}

interface SessionBookingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  coach: Coach;
  userGoal?: any;
}

export const SessionBookingFlow = ({ isOpen, onClose, coach, userGoal }: SessionBookingFlowProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const { toast } = useToast();

  // Generate available time slots for selected date
  useEffect(() => {
    if (!selectedDate) return;
    
    const slots: string[] = [];
    const today = new Date();
    const startHour = 9; // 9 AM
    const endHour = 17; // 5 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = setMinutes(setHours(selectedDate, hour), minute);
        
        // Only show future slots
        if (isAfter(slotTime, addDays(today, 0))) {
          slots.push(format(slotTime, 'HH:mm'));
        }
      }
    }
    
    setTimeSlots(slots);
  }, [selectedDate]);

  const calculateCost = () => {
    const priceAmount = (coach.hourly_rate_amount * sessionDuration) / 60;
    const coinCost = Math.round((coach.hourly_coin_cost * sessionDuration) / 60);
    return { priceAmount, coinCost };
  };

  const handleBookSession = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time for your session.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Create scheduled time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledTime = setMinutes(setHours(selectedDate, hours), minutes);

      // Create video session
      const { data, error } = await supabase.functions.invoke('create-video-session', {
        body: {
          coachId: coach.id,
          scheduledTime: scheduledTime.toISOString(),
          sessionDuration,
        }
      });

      if (error) throw error;

      // Get user profile for enhanced emails
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();

      // Send enhanced session confirmation email to client
      await supabase.functions.invoke('send-enhanced-session-email', {
        body: {
          sessionId: data.sessionId,
          clientEmail: user?.email,
          clientName: profile?.full_name,
          coachName: coach.name,
          emailType: 'confirmation'
        }
      });

      // Send enhanced coach notification
      const { data: coachData } = await supabase
        .from('coaches')
        .select('notification_email')
        .eq('id', coach.id)
        .single();

      await supabase.functions.invoke('send-enhanced-coach-notification', {
        body: {
          sessionId: data.sessionId,
          coachEmail: coachData?.notification_email || 'coach@example.com'
        }
      });

      toast({
        title: "Session Booked!",
        description: `Your ${sessionDuration}-minute session with ${coach.name} has been scheduled for ${format(scheduledTime, 'PPP p')}. Check your email for details and calendar invite.`,
      });

      // Redirect to session page instead of closing dialog
      window.location.href = `/session/${data.sessionId}`;
      
    } catch (error) {
      console.error('Error booking session:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error booking your session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { priceAmount, coinCost } = calculateCost();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Book Session with {coach.name}
          </DialogTitle>
          <DialogDescription>
            Schedule a one-on-one video coaching session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Session Duration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={sessionDuration.toString()} onValueChange={(value) => setSessionDuration(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => 
                  date < new Date() || date > addDays(new Date(), 30)
                }
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Time Selection */}
          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Time</CardTitle>
                <CardDescription>
                  Available times for {format(selectedDate, 'PPP')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      onClick={() => setSelectedTime(time)}
                      className="text-sm"
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration
                  </span>
                  <Badge variant="secondary">{sessionDuration} minutes</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Price
                  </span>
                  <span className="font-medium">${priceAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Coin Cost
                  </span>
                  <span className="font-medium">{coinCost} coins</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Book Button */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleBookSession} 
              disabled={!selectedDate || !selectedTime || loading}
              className="flex-1"
            >
              {loading ? "Booking..." : "Book Session"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};