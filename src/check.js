// src/check.js
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.getElementById("check-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const bookingId = document.getElementById("booking-id").value.trim();
  const resultDiv = document.getElementById("result");

  if (!bookingId) return;

  const bookingRef = doc(db, "patients", bookingId);
  const bookingSnap = await getDoc(bookingRef);

  if (bookingSnap.exists()) {
    const bookingData = bookingSnap.data();
    resultDiv.innerHTML = `
      <p><strong>Name:</strong> ${bookingData.name}</p>
      <p><strong>Gender:</strong> ${bookingData.gender}</p>
      <p><strong>Age:</strong> ${bookingData.age}</p>
      <p><strong>Phone:</strong> ${bookingData.phone}</p>
      <p><strong>Slot ID:</strong> ${bookingData.slotId}</p>
      <p><strong>Payment Mode:</strong> ${bookingData.paymentMode}</p>
      <p><strong>Payment Status:</strong> ${bookingData.paymentStatus}</p>
      <p><strong>Appointment Time:</strong> ${bookingData.appointmentTime || "Not assigned"}</p>
    `;
  } else {
    resultDiv.textContent = "No booking found with this ID.";
  }
});
