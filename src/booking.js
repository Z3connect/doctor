// src/booking.js
import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  getDoc
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  await populateSlots();
  await fetchUPI();

  const bookingForm = document.getElementById("booking-form");
  const paymentModes = document.querySelectorAll('input[name="paymentMode"]');
  const upiInfoDiv = document.getElementById("upi-info");
  const paidBtn = document.getElementById("paid-btn");

  // Toggle UPI info based on selected payment method
  paymentModes.forEach(radio => {
    radio.addEventListener("change", () => {
      if (radio.value === "gpay" && radio.checked) {
        upiInfoDiv.classList.remove("hidden");
      } else {
        upiInfoDiv.classList.add("hidden");
      }
    });
  });

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const symptoms = document.getElementById("symptoms").value.trim();
    const slotId = document.getElementById("slot-select").value;
    const paymentMode = document.querySelector('input[name="paymentMode"]:checked').value;

    // Create a new booking document in Firestore with paymentStatus "pending"
    const bookingDocRef = doc(collection(db, "patients"));
    await setDoc(bookingDocRef, {
      name,
      phone,
      symptoms,
      slotId,
      paymentMode,
      paymentStatus: "pending",
      timestamp: serverTimestamp()
    });

    // Add booking ID to the slot's bookedPatients array
    const slotRef = doc(db, "slots", slotId);
    await updateDoc(slotRef, {
      bookedPatients: arrayUnion(bookingDocRef.id)
    });

    // Redirect to the confirmation page with bookingId as a query parameter
    window.location.href = `success.html?bookingId=${bookingDocRef.id}`;
  });

  paidBtn.addEventListener("click", () => {
    alert("Payment received. The doctor will confirm your appointment time shortly.");
  });
});

async function populateSlots() {
  const slotSelect = document.getElementById("slot-select");
  const slotsSnapshot = await getDocs(collection(db, "slots"));
  slotsSnapshot.forEach(docSnapshot => {
    const slotData = docSnapshot.data();
    // Check if the slot is visible and the booked count is less than maxPatients
    const bookedCount = slotData.bookedPatients ? slotData.bookedPatients.length : 0;
    if (slotData.visible && bookedCount < slotData.maxPatients) {
      const option = document.createElement("option");
      option.value = docSnapshot.id;
      option.textContent = `${slotData.date} | ${slotData.openingTime} - ${slotData.closingTime}`;
      slotSelect.appendChild(option);
    }
  });
}

async function fetchUPI() {
  // For this example we use a placeholder UPI; you could integrate with your settings document
  document.getElementById("upi-id").textContent = "yourupi@bank";
}
