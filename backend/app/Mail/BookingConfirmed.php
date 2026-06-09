<?php

namespace App\Mail;

use App\Models\AIpreneurClassBooking;
use App\Models\AIpreneurClassSlot;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BookingConfirmed extends Mailable
{
    use Queueable, SerializesModels;

    public AIpreneurClassBooking $booking;
    public AIpreneurClassSlot $slot;
    public string $status;

    public function __construct(AIpreneurClassBooking $booking, AIpreneurClassSlot $slot, string $status)
    {
        $this->booking = $booking;
        $this->slot = $slot;
        $this->status = $status;
    }

    public function build()
    {
        $classTitle = $this->slot->course?->title ?? 'AIpreneur Class';
        return $this->subject("Class Booking {$this->status}: {$classTitle}")
            ->view('emails.booking_confirmed');
    }
}
