// src/admin.js
import { db } from "./firebase-init.js";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // Create Slot Form submission
  const slotForm = document.getElementById("slot-form");
  slotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = document.getElementById("slot-date").value.trim();
    const openingTime = document.getElementById("opening-time").value.trim();
    const closingTime = document.getElementById("closing-time").value.trim();
    const maxPatients = parseInt(document.getElementById("max-patients").value.trim(), 10);

    // Default new slot as visible:true
    const slotRef = doc(collection(db, "slots"));
    await setDoc(slotRef, {
      date,
      openingTime,
      closingTime,
      maxPatients,
      bookedPatients: [],
      visible: true
    });
    alert("Slot created successfully!");
    slotForm.reset();
    fetchManageSlots();
  });

  // UPI Settings Form submission (if needed)
  const upiForm = document.getElementById("upi-form");
  if (upiForm) {
    upiForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const upiId = document.getElementById("upi-id-input").value.trim();
      const upiRef = doc(db, "settings", "upi");
      await setDoc(upiRef, { upiId }, { merge: true });
      alert("UPI ID updated successfully!");
      upiForm.reset();
    });
  }

  // Load and display bookings list
  fetchBookings();

  // Load and display slots list for management
  fetchManageSlots();
});

//
// Function to fetch and display all bookings (same as before)
//
async function fetchBookings() {
  const bookingsBody = document.getElementById("bookings-body");
  const bookingsSnapshot = await getDocs(collection(db, "patients"));
  bookingsBody.innerHTML = "";
  bookingsSnapshot.forEach(docSnapshot => {
    const booking = docSnapshot.data();
    const row = document.createElement("tr");

    // Name cell
    const nameCell = document.createElement("td");
    nameCell.textContent = booking.name;
    nameCell.classList.add("border", "px-4", "py-2");
    row.appendChild(nameCell);

    // Phone cell
    const phoneCell = document.createElement("td");
    phoneCell.textContent = booking.phone;
    phoneCell.classList.add("border", "px-4", "py-2");
    row.appendChild(phoneCell);

    // Slot cell – here we show the slot ID. (Ideally, resolve this to a proper time range.)
    const slotCell = document.createElement("td");
    slotCell.textContent = booking.slotId;
    slotCell.classList.add("border", "px-4", "py-2");
    row.appendChild(slotCell);

    // Payment Mode cell
    const paymentCell = document.createElement("td");
    paymentCell.textContent = booking.paymentMode;
    paymentCell.classList.add("border", "px-4", "py-2");
    row.appendChild(paymentCell);

    // Payment Status cell
    const statusCell = document.createElement("td");
    statusCell.textContent = booking.paymentStatus;
    statusCell.classList.add("border", "px-4", "py-2");
    row.appendChild(statusCell);

    // Appointment Time cell
    const appointCell = document.createElement("td");
    appointCell.textContent = booking.appointmentTime ? booking.appointmentTime : "Not assigned";
    appointCell.classList.add("border", "px-4", "py-2");
    row.appendChild(appointCell);

    // Actions cell: Mark Payment as Paid / Assign Appointment Time
    const actionCell = document.createElement("td");
    actionCell.classList.add("border", "px-4", "py-2");
    
    // Mark as Paid button for GPay pending payments
    if (booking.paymentMode === "gpay" && booking.paymentStatus === "pending") {
      const markPaidBtn = document.createElement("button");
      markPaidBtn.textContent = "Mark as Paid";
      markPaidBtn.classList.add("bg-green-500", "text-white", "px-2", "py-1", "rounded", "mr-2");
      markPaidBtn.addEventListener("click", async () => {
        await updateDoc(doc(db, "patients", docSnapshot.id), { paymentStatus: "paid" });
        alert("Payment marked as paid");
        fetchBookings();
      });
      actionCell.appendChild(markPaidBtn);
    }

    // Assign Appointment Time if not set yet
    if (!booking.appointmentTime) {
      const assignBtn = document.createElement("button");
      assignBtn.textContent = "Assign Appointment Time";
      assignBtn.classList.add("bg-blue-500", "text-white", "px-2", "py-1", "rounded");
      assignBtn.addEventListener("click", async () => {
        const aptTime = prompt("Enter appointment time (e.g., 09:00 AM - 09:30 AM):");
        if (aptTime) {
          await updateDoc(doc(db, "patients", docSnapshot.id), { appointmentTime: aptTime });
          alert("Appointment time assigned");
          fetchBookings();
        }
      });
      actionCell.appendChild(assignBtn);
    }

    row.appendChild(actionCell);
    bookingsBody.appendChild(row);
  });
}

//
// Functions to fetch and manage slots
//
async function fetchManageSlots() {
  const slotsBody = document.getElementById("slots-body");
  const slotsSnapshot = await getDocs(collection(db, "slots"));
  slotsBody.innerHTML = "";
  slotsSnapshot.forEach(docSnapshot => {
    const slot = docSnapshot.data();
    const slotId = docSnapshot.id;
    const row = document.createElement("tr");

    // Date cell
    const dateCell = document.createElement("td");
    dateCell.textContent = slot.date;
    dateCell.classList.add("border", "px-4", "py-2");
    row.appendChild(dateCell);

    // Time cell (combine opening and closing time)
    const timeCell = document.createElement("td");
    timeCell.textContent = `${slot.openingTime} - ${slot.closingTime}`;
    timeCell.classList.add("border", "px-4", "py-2");
    row.appendChild(timeCell);

    // Max Patients cell
    const maxCell = document.createElement("td");
    maxCell.textContent = slot.maxPatients;
    maxCell.classList.add("border", "px-4", "py-2");
    row.appendChild(maxCell);

    // Visibility cell
    const visibilityCell = document.createElement("td");
    visibilityCell.textContent = slot.visible ? "Visible" : "Hidden";
    visibilityCell.classList.add("border", "px-4", "py-2");
    row.appendChild(visibilityCell);

    // Actions cell: Edit, Delete, Toggle Visibility
    const actionCell = document.createElement("td");
    actionCell.classList.add("border", "px-4", "py-2");

    // Edit Button: Prompt for new details and update
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.classList.add("bg-yellow-500", "text-white", "px-2", "py-1", "rounded", "mr-2");
    editBtn.addEventListener("click", async () => {
      const newDate = prompt("Edit Date (YYYY-MM-DD):", slot.date);
      if (!newDate) return;
      const newOpening = prompt("Edit Opening Time (e.g., 09:00 AM):", slot.openingTime);
      if (!newOpening) return;
      const newClosing = prompt("Edit Closing Time (e.g., 09:30 AM):", slot.closingTime);
      if (!newClosing) return;
      const newMax = prompt("Edit Max Patients:", slot.maxPatients);
      if (!newMax) return;
      await updateDoc(doc(db, "slots", slotId), {
        date: newDate,
        openingTime: newOpening,
        closingTime: newClosing,
        maxPatients: parseInt(newMax, 10)
      });
      alert("Slot updated successfully!");
      fetchManageSlots();
    });
    actionCell.appendChild(editBtn);

    // Delete Button: Remove slot document
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.classList.add("bg-red-500", "text-white", "px-2", "py-1", "rounded", "mr-2");
    deleteBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete this slot?")) {
        await deleteDoc(doc(db, "slots", slotId));
        alert("Slot deleted successfully!");
        fetchManageSlots();
      }
    });
    actionCell.appendChild(deleteBtn);

    // Toggle Visibility Button: Switch the visible field
    const toggleBtn = document.createElement("button");
    toggleBtn.textContent = slot.visible ? "Hide Slot" : "Show Slot";
    toggleBtn.classList.add("bg-blue-500", "text-white", "px-2", "py-1", "rounded");
    toggleBtn.addEventListener("click", async () => {
      await updateDoc(doc(db, "slots", slotId), { visible: !slot.visible });
      alert("Slot visibility updated!");
      fetchManageSlots();
    });
    actionCell.appendChild(toggleBtn);

    row.appendChild(actionCell);
    slotsBody.appendChild(row);
  });
}
