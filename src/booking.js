// src/booking.js
import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  await populateSlots();
  await fetchUPI();

  const bookingForm = document.getElementById("booking-form");

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Retrieve form values including new gender and age fields.
    const name = document.getElementById("name").value.trim();
    const gender = document.getElementById("gender").value;
    const age = document.getElementById("age").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const symptoms = document.getElementById("symptoms").value.trim();
    const slotId = document.getElementById("slot-select").value;
    const paymentMode = document.querySelector('input[name="paymentMode"]:checked').value;

    // Create a new booking document in Firestore with the additional fields.
    const bookingDocRef = doc(collection(db, "patients"));
    await setDoc(bookingDocRef, {
      name,
      gender,
      age,
      phone,
      symptoms,
      slotId,
      paymentMode,
      paymentStatus: "pending",
      timestamp: serverTimestamp()
    });

    // Add this booking ID to the slot's bookedPatients array.
    const slotRef = doc(db, "slots", slotId);
    await updateDoc(slotRef, {
      bookedPatients: arrayUnion(bookingDocRef.id)
    });

    // Redirect to the confirmation page with the booking ID in the query parameters.
    window.location.href = `success.html?bookingId=${bookingDocRef.id}`;
  });
});

async function populateSlots() {
  const slotSelect = document.getElementById("slot-select");
  const slotsSnapshot = await getDocs(collection(db, "slots"));

  slotsSnapshot.forEach(docSnapshot => {
    const slotData = docSnapshot.data();
    const bookedCount = slotData.bookedPatients ? slotData.bookedPatients.length : 0;
    // Only add the slot if it is marked as visible and has not reached max capacity.
    if (slotData.visible && bookedCount < slotData.maxPatients) {
      const option = document.createElement("option");
      option.value = docSnapshot.id;
      option.textContent = `${slotData.date} | ${slotData.openingTime} - ${slotData.closingTime}`;
      slotSelect.appendChild(option);
    }
  });
}

async function fetchUPI() {
  // For this example we use a placeholder UPI; you could integrate with your settings document if needed.
  document.getElementById("upi-id").textContent = "yourupi@bank";
}
