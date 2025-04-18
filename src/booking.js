// src/booking.js
import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  await populateSlots();

  const bookingForm = document.getElementById("booking-form");
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Disable the submit button to prevent double submissions
    const submitBtn = document.getElementById("submit-btn");
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing...";
    submitBtn.classList.add("opacity-50", "cursor-not-allowed");

    try {
      // Gather all form values
      const name = document.getElementById("name").value.trim();
      const gender = document.getElementById("gender").value;
      const age = document.getElementById("age").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const symptoms = document.getElementById("symptoms").value.trim();
      const slotId = document.getElementById("slot-select").value;
      const paymentMode = document.querySelector('input[name="paymentMode"]:checked').value;

      // Validate that a slot is selected
      if (!slotId) {
        alert("Please select an appointment slot");
        submitBtn.disabled = false;
        submitBtn.textContent = "Confirm Booking";
        submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
        return;
      }

      // Get current time for client-side timestamp
      const now = new Date();
      const bookingTime = now.toISOString();
      const formattedBookingTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      // Create booking document with proper booking time
      const bookingRef = doc(collection(db, "patients"));
      await setDoc(bookingRef, {
        name,
        gender,
        age,
        phone,
        symptoms,
        slotId,
        paymentMode,
        paymentStatus: "pending",
        bookingTime: formattedBookingTime, // Human-readable booking time (HH:MM)
        bookingDate: now.toDateString(), // Human-readable date (e.g., "Mon Apr 17 2025")
        bookingTimestamp: serverTimestamp(), // Server timestamp for accurate sorting
        bookingDateTime: bookingTime, // Full ISO date string as backup
        timestamp: serverTimestamp()
      });

      // Mark slot as booked by adding patient ID to the slot's bookedPatients array
      const slotRef = doc(db, "slots", slotId);
      await updateDoc(slotRef, {
        bookedPatients: arrayUnion(bookingRef.id)
      });

      // Redirect to success page with booking ID
      window.location.href = `success.html?bookingId=${bookingRef.id}`;
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("There was an error processing your booking. Please try again.");
      
      // Re-enable the submit button
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Booking";
      submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
    }
  });
});

async function populateSlots() {
  const slotSelect = document.getElementById("slot-select");
  
  try {
    // Clear any existing options except the first placeholder
    while (slotSelect.options.length > 1) {
      slotSelect.remove(1);
    }
    
    // Add or update placeholder option
    if (slotSelect.options.length === 0) {
      const placeholderOption = document.createElement("option");
      placeholderOption.value = "";
      placeholderOption.textContent = "Loading slots...";
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      slotSelect.appendChild(placeholderOption);
    } else {
      slotSelect.options[0].textContent = "Loading slots...";
    }
    
    // Get all available slots from Firestore
    const slotsSnapshot = await getDocs(collection(db, "slots"));
    
    // Check if we have any slots
    if (slotsSnapshot.empty) {
      slotSelect.options[0].textContent = "No slots available";
      return;
    }
    
    // Update placeholder text
    slotSelect.options[0].textContent = "Select a time slot";
    
    // Get current date for filtering out past slots
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Collect available slots
    const availableSlots = [];
    
    slotsSnapshot.forEach(docSnap => {
      const slot = docSnap.data();
      const bookedCount = (slot.bookedPatients || []).length;
      
      // Only add slots that are:
      // 1. Visible to patients
      // 2. Not fully booked
      // 3. Not in the past
      if (slot.visible && bookedCount < slot.maxPatients && slot.date >= todayStr) {
        availableSlots.push({
          id: docSnap.id,
          date: slot.date,
          openingTime: slot.openingTime,
          closingTime: slot.closingTime,
          maxPatients: slot.maxPatients,
          bookedCount: bookedCount
        });
      }
    });
    
    // Sort slots by date and time
    availableSlots.sort((a, b) => {
      // Sort by date first
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      
      // If dates are the same, sort by opening time
      return a.openingTime.localeCompare(b.openingTime);
    });
    
    // Add sorted slots to the select element
    availableSlots.forEach(slot => {
      const opt = document.createElement("option");
      opt.value = slot.id;
      
      // Format the date for display
      const dateObj = new Date(slot.date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      opt.textContent = `${formattedDate} | ${slot.openingTime} - ${slot.closingTime} (${slot.bookedCount}/${slot.maxPatients})`;
      slotSelect.appendChild(opt);
    });
    
    // If no available slots after filtering
    if (availableSlots.length === 0) {
      slotSelect.options[0].textContent = "No slots available";
    }
  } catch (error) {
    console.error("Error loading slots:", error);
    slotSelect.options[0].textContent = "Error loading slots";
  }
}