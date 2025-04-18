// src/admin.js
import { db } from "./firebase-init.js";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // Toggle mobile menu
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");
  
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
  }

  // Tab switching
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");
  
  tabButtons.forEach(button => {
    button.addEventListener("click", () => {
      // Reset all tabs
      tabButtons.forEach(btn => {
        btn.classList.remove("bg-blue-500", "text-white");
      });
      tabContents.forEach(content => {
        content.classList.add("hidden");
      });
      
      // Set active tab
      button.classList.add("bg-blue-500", "text-white");
      
      // Show corresponding content
      const contentId = button.id.replace("tab-", "");
      document.getElementById(contentId).classList.remove("hidden");
    });
  });

  // Mobile menu navigation
  const mobileLinks = mobileMenu.querySelectorAll("a");
  mobileLinks.forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.classList.add("hidden");
      const targetId = link.getAttribute("href").substring(1);
      
      // Activate corresponding tab
      tabButtons.forEach(btn => {
        btn.classList.remove("bg-blue-500", "text-white");
        if (btn.id === `tab-${targetId}`) {
          btn.classList.add("bg-blue-500", "text-white");
        }
      });
      
      // Show corresponding content
      tabContents.forEach(content => {
        content.classList.add("hidden");
      });
      document.getElementById(targetId).classList.remove("hidden");
    });
  });

  // Create Slot Form submission
  const slotForm = document.getElementById("slot-form");
  slotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Show loading state
    const submitButton = slotForm.querySelector("button[type='submit']");
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Creating...';
    submitButton.disabled = true;
    
    try {
      const dateInput = document.getElementById("slot-date").value;
      const openingTime = document.getElementById("opening-time").value;
      const closingTime = document.getElementById("closing-time").value;
      const maxPatients = parseInt(document.getElementById("max-patients").value, 10);
      const visible = document.getElementById("slot-visible").checked;
      
      // Format time for display (convert from 24h to 12h format if needed)
      const formatTimeForDisplay = (timeString) => {
        const [hours, minutes] = timeString.split(':');
        let hour = parseInt(hours, 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12;
        return `${hour}:${minutes} ${ampm}`;
      };
      
      // Create a new slot
      const slotRef = doc(collection(db, "slots"));
      await setDoc(slotRef, {
        date: dateInput,
        openingTime: formatTimeForDisplay(openingTime),
        closingTime: formatTimeForDisplay(closingTime),
        maxPatients,
        bookedPatients: [],
        visible,
        createdAt: serverTimestamp()
      });
      
      // Show success message
      showNotification("Slot created successfully!", "success");
      slotForm.reset();
      
      // Refresh data
      await fetchManageSlots();
      await updateDashboardStats();
    } catch (error) {
      console.error("Error creating slot:", error);
      showNotification("Error creating slot. Please try again.", "error");
    } finally {
      // Restore button state
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
    }
  });

  // UPI Settings Form submission
  const upiForm = document.getElementById("upi-form");
  if (upiForm) {
    upiForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // Show loading state
      const submitButton = upiForm.querySelector("button[type='submit']");
      const originalButtonText = submitButton.innerHTML;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Updating...';
      submitButton.disabled = true;
      
      try {
        const upiId = document.getElementById("upi-id-input").value.trim();
        const upiRef = doc(db, "settings", "upi");
        await setDoc(upiRef, { upiId, updatedAt: serverTimestamp() }, { merge: true });
        
        showNotification("UPI ID updated successfully!", "success");
        
        // Don't reset the form so users can see what they entered
      } catch (error) {
        console.error("Error updating UPI:", error);
        showNotification("Error updating UPI. Please try again.", "error");
      } finally {
        // Restore button state
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
      }
    });
    
    // Load current UPI settings when tab is shown
    document.getElementById("tab-upi").addEventListener("click", loadUpiSettings);
  }

  // Slot search functionality
  const slotSearch = document.getElementById("slot-search");
  if (slotSearch) {
    slotSearch.addEventListener("input", () => {
      const searchTerm = slotSearch.value.toLowerCase();
      const rows = document.querySelectorAll("#slots-body tr");
      
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? "" : "none";
      });
    });
  }

  // Booking search functionality
  const bookingSearch = document.getElementById("booking-search");
  if (bookingSearch) {
    bookingSearch.addEventListener("input", () => {
      filterBookings("all");
    });
  }

  // Slot filter buttons
  document.getElementById("slot-filter-all").addEventListener("click", (e) => {
    setActiveFilterButton(e.target);
    const rows = document.querySelectorAll("#slots-body tr");
    rows.forEach(row => {
      row.style.display = "";
    });
  });

  document.getElementById("slot-filter-visible").addEventListener("click", (e) => {
    setActiveFilterButton(e.target);
    const rows = document.querySelectorAll("#slots-body tr");
    rows.forEach(row => {
      const statusCell = row.querySelector("td:nth-child(4)");
      row.style.display = statusCell.textContent.includes("Visible") ? "" : "none";
    });
  });

  document.getElementById("slot-filter-hidden").addEventListener("click", (e) => {
    setActiveFilterButton(e.target);
    const rows = document.querySelectorAll("#slots-body tr");
    rows.forEach(row => {
      const statusCell = row.querySelector("td:nth-child(4)");
      row.style.display = statusCell.textContent.includes("Hidden") ? "" : "none";
    });
  });

  // Date filter - add this listener
  document.getElementById("filter-date").addEventListener("change", function() {
    filterBookings("all");
  });

  // Booking filter buttons
  document.getElementById("booking-filter-all").addEventListener("click", (e) => {
    setActiveFilterButton(e.target);
    filterBookings("all");
  });
  
  document.getElementById("booking-filter-today").addEventListener("click", (e) => {
    setActiveFilterButton(e.target);
    filterBookings("today");
  });
  
  document.getElementById("booking-filter-paid").addEventListener("click", (e) => {
    setActiveFilterButton(e.target);
    filterBookings("paid");
  });
  
  document.getElementById("booking-filter-pending").addEventListener("click", (e) => {
    setActiveFilterButton(e.target);
    filterBookings("pending");
  });
  
  document.getElementById("booking-filter-no-time").addEventListener("click", (e) => {
    setActiveFilterButton(e.target);
    filterBookings("no-time");
  });

  // Reset filters button
  document.getElementById("reset-filters").addEventListener("click", () => {
    // Clear search and date filters
    document.getElementById("booking-search").value = "";
    document.getElementById("filter-date").value = "";
    
    // Reset active button
    setActiveFilterButton(document.getElementById("booking-filter-all"));
    
    // Show all bookings
    filteredBookings = [...allBookings];
    currentPage = 1;
    renderBookingsTable();
  });

  // Reports tab
  document.getElementById("generate-report").addEventListener("click", generateReport);

  // Initialize data
  fetchBookings();
  fetchManageSlots();
  updateDashboardStats();
  loadUpiSettings();
});

// Function to load current UPI settings
async function loadUpiSettings() {
  try {
    const upiRef = doc(db, "settings", "upi");
    const upiSnap = await getDoc(upiRef);
    
    if (upiSnap.exists()) {
      const data = upiSnap.data();
      document.getElementById("upi-id-input").value = data.upiId || "";
    }
  } catch (error) {
    console.error("Error loading UPI settings:", error);
  }
}

// Function to update dashboard stats
async function updateDashboardStats() {
  try {
    // Get slots count
    const slotsSnap = await getDocs(collection(db, "slots"));
    const totalSlots = slotsSnap.size;
    document.getElementById("total-slots").textContent = totalSlots;
    
    // Count pending slots (future dates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    let pendingSlots = 0;
    slotsSnap.forEach(doc => {
      const slot = doc.data();
      if (slot.date >= todayStr) {
        pendingSlots++;
      }
    });
    document.getElementById("pending-slots").textContent = pendingSlots;
    
    // Get bookings count
    const bookingsSnap = await getDocs(collection(db, "patients"));
    const totalBookings = bookingsSnap.size;
    document.getElementById("total-bookings").textContent = totalBookings;
    
    // Count pending payments
    let pendingPayments = 0;
    bookingsSnap.forEach(doc => {
      const booking = doc.data();
      if (booking.paymentStatus === "pending") {
        pendingPayments++;
      }
    });
    document.getElementById("pending-payments").textContent = pendingPayments;
    
  } catch (error) {
    console.error("Error updating dashboard stats:", error);
  }
}

// Helper function to set active filter button
function setActiveFilterButton(button) {
  // Get all siblings
  const parent = button.parentElement;
  const siblings = parent.querySelectorAll("button");
  
  // Reset all buttons
  siblings.forEach(btn => {
    btn.classList.remove("bg-blue-600", "text-white");
    btn.classList.add("bg-gray-200", "text-gray-700");
  });
  
  // Set active button
  button.classList.remove("bg-gray-200", "text-gray-700");
  button.classList.add("bg-blue-600", "text-white");
}

// Pagination variables
let currentPage = 1;
let itemsPerPage = 10;
let allBookings = [];
let filteredBookings = [];

// Format functions
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const options = { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatTimeDisplay(timeString) {
  if (!timeString) return "Not assigned";
  return timeString;
}

// Dashboard stats update
function updateBookingStats(bookings) {
  // Get today's date in yyyy-mm-dd format
  const today = new Date().toISOString().split('T')[0];
  
  // Count metrics
  let todayCount = 0;
  let confirmedCount = 0;
  let pendingPaymentCount = 0;
  let noTimeCount = 0;
  
  bookings.forEach(booking => {
    // Check if booking is for today (by slot date or by direct date property if it exists)
    if (booking.slotDate === today || (booking.date === today)) {
      todayCount++;
    }
    
    // Confirmed = has appointment time and is paid
    if (booking.appointmentTime && booking.paymentStatus === "paid") {
      confirmedCount++;
    }
    
    // Pending payment
    if (booking.paymentStatus === "pending") {
      pendingPaymentCount++;
    }
    
    // No time assigned
    if (!booking.appointmentTime) {
      noTimeCount++;
    }
  });
  
  // Update the UI
  document.getElementById("today-count").textContent = todayCount;
  document.getElementById("confirmed-count").textContent = confirmedCount;
  document.getElementById("pending-payment-count").textContent = pendingPaymentCount;
  document.getElementById("no-time-count").textContent = noTimeCount;
}

// Enhanced fetch bookings function
async function fetchBookings() {
  try {
    // Show loading state
    const bookingsBody = document.getElementById("bookings-body");
    bookingsBody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-4 text-center">
          <div class="inline-block w-6 h-6 border-4 rounded-full text-blue-600 border-t-transparent animate-spin mb-2"></div>
          <p class="text-gray-500">Loading appointments...</p>
        </td>
      </tr>
    `;
    
    // Hide no results message if shown
    document.getElementById("no-results").classList.add("hidden");
    
    // Get slots
    const slotsSnap = await getDocs(collection(db, "slots"));
    const slotMap = {};
    const slotDateMap = {}; // Store dates for filtering
    
    slotsSnap.forEach(docSnapshot => {
      const data = docSnapshot.data();
      slotMap[docSnapshot.id] = `${data.date} | ${data.openingTime} - ${data.closingTime}`;
      slotDateMap[docSnapshot.id] = data.date;
    });

    // Get bookings
    const bookingsSnapshot = await getDocs(collection(db, "patients"));
    
    if (bookingsSnapshot.empty) {
      showNoResults();
      return;
    }
    
    // Reset allBookings array
    allBookings = [];
    
    // Process all bookings
    bookingsSnapshot.forEach(docSnapshot => {
      const booking = {
        id: docSnapshot.id,
        ...docSnapshot.data(),
        // Add slot date for filtering with error handling
        slotDate: slotDateMap[docSnapshot.data().slotId] || "",
        // Format slot display with error handling
        slotDisplay: slotMap[docSnapshot.data().slotId] || 
          (docSnapshot.data().slotId ? "Slot Deleted" : "N/A")
      };
      allBookings.push(booking);
    });
    
    // Update dashboard stats
    updateBookingStats(allBookings);
    


    
    filteredBookings = [...allBookings];
    // New:
    sortBookings("bookingTimestamp", "asc");  // first‐come, first‐served

    
    // Render the table
    renderBookingsTable();
    
  } catch (error) {
    console.error("Error fetching bookings:", error);
    const bookingsBody = document.getElementById("bookings-body");
    bookingsBody.innerHTML = `
      <tr>
        <td colspan="8" class="px-3 py-3 text-center">
          <div class="text-red-500 mb-2">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <p class="text-red-500 font-medium">Error loading appointments</p>
          <p class="text-gray-500 text-sm">Please try refreshing the page</p>
        </td>
      </tr>
    `;
  }
}

// Function to show no results message
function showNoResults() {
  document.getElementById("bookings-body").innerHTML = "";
  document.getElementById("no-results").classList.remove("hidden");
  
  // Update pagination
  document.getElementById("total-items").textContent = "0";
  document.getElementById("page-start").textContent = "0";
  document.getElementById("page-end").textContent = "0";
  document.getElementById("pagination-numbers").innerHTML = "";
}

// Function to filter bookings
// Function to filter bookings
function filterBookings(filterType) {
  const searchTerm = document.getElementById("booking-search").value.toLowerCase();
  const dateFilter = document.getElementById("filter-date").value;
  
  // Start with all bookings
  let filtered = [...allBookings];
  
  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(booking => {
      return (
        (booking.name && booking.name.toLowerCase().includes(searchTerm)) ||
        (booking.phone && booking.phone.toLowerCase().includes(searchTerm)) ||
        (booking.symptoms && booking.symptoms.toLowerCase().includes(searchTerm))
      );
    });
  }
  
  // Apply date filter
  if (dateFilter) {
    filtered = filtered.filter(booking => booking.slotDate === dateFilter);
  }
  
  // Apply specific filters
  if (filterType === "today") {
    const today = new Date().toISOString().split('T')[0];
    filtered = filtered.filter(booking => booking.slotDate === today);
    console.log(`Found ${filtered.length} bookings for today (${today})`);
  } else if (filterType === "paid") {
    filtered = filtered.filter(booking => booking.paymentStatus === "paid");
  } else if (filterType === "pending") {
    filtered = filtered.filter(booking => booking.paymentStatus === "pending");
  } else if (filterType === "no-time") {
    filtered = filtered.filter(booking => !booking.appointmentTime);
  } else if (filterType === "priority") {
    // First-come, first-served priority sort
    filtered.sort((a, b) => {
      // Prefer Firestore serverTimestamp if available
      if (a.bookingTimestamp && b.bookingTimestamp) {
        return a.bookingTimestamp.seconds - b.bookingTimestamp.seconds;
      }
      // Fallback to ISO-string date
      const dateA = a.bookingDateTime ? new Date(a.bookingDateTime) : new Date(0);
      const dateB = b.bookingDateTime ? new Date(b.bookingDateTime) : new Date(0);
      return dateA - dateB;
    });
  }
  
  // Update filtered bookings and reset to first page
  filteredBookings = filtered;
  currentPage = 1;
  
  // Render table with new filters
  if (filteredBookings.length === 0) {
    showNoResults();
  } else {
    renderBookingsTable();
  }
}


// Function to sort bookings
// Update the sortBookings function in admin.js to include bookingTimestamp
function sortBookings(field, direction = "asc") {
  // Special case for booking timestamp sorting
  if (field === "bookingTimestamp") {
        filteredBookings.sort((a, b) => {
          // Prefer serverTimestamp if available
          if (a.bookingTimestamp && b.bookingTimestamp) {
            return direction === "asc"
              ? a.bookingTimestamp.seconds - b.bookingTimestamp.seconds
              : b.bookingTimestamp.seconds - a.bookingTimestamp.seconds;
          }
          // Fallback to ISO string
          const dateA = a.bookingDateTime ? new Date(a.bookingDateTime) : new Date(0);
          const dateB = b.bookingDateTime ? new Date(b.bookingDateTime) : new Date(0);
          return direction === "asc" ? dateA - dateB : dateB - dateA;
        });
        renderBookingsTable();
        return;
     } else {
    // Existing sorting code for other fields
    filteredBookings.sort((a, b) => {
      let valueA = a[field] || "";
      let valueB = b[field] || "";
      
      // Convert to lowercase for string comparison
      if (typeof valueA === "string") valueA = valueA.toLowerCase();
      if (typeof valueB === "string") valueB = valueB.toLowerCase();
      
      // Handle numeric fields
      if (field === "age") {
        valueA = parseInt(valueA) || 0;
        valueB = parseInt(valueB) || 0;
      }
      
      // Compare
      if (valueA < valueB) return direction === "asc" ? -1 : 1;
      if (valueA > valueB) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }
  
  renderBookingsTable();
}

// Function to render bookings table
function renderBookingsTable() {
  const bookingsBody = document.getElementById("bookings-body");
  bookingsBody.innerHTML = "";
  
  // Calculate pagination
  const totalItems = filteredBookings.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  // Update pagination display
  document.getElementById("total-items").textContent = totalItems;
  document.getElementById("page-start").textContent = totalItems > 0 ? startIndex + 1 : 0;
  document.getElementById("page-end").textContent = endIndex;
  
  // Generate pagination numbers
  const paginationNumbers = document.getElementById("pagination-numbers");
  paginationNumbers.innerHTML = "";
  
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement("button");
    pageButton.className = `border border-gray-300 text-sm px-2 py-1 ${
      i === currentPage 
        ? "bg-blue-600 text-white border-blue-600" 
        : "bg-white text-gray-700 hover:bg-gray-50"
    }`;
    pageButton.textContent = i;
    pageButton.addEventListener("click", () => {
      currentPage = i;
      renderBookingsTable();
    });
    paginationNumbers.appendChild(pageButton);
  }
  
  // Enable/disable prev/next buttons
  document.getElementById("prev-page").disabled = currentPage === 1;
  document.getElementById("prev-page").classList.toggle("opacity-50", currentPage === 1);
  document.getElementById("next-page").disabled = currentPage === totalPages;
  document.getElementById("next-page").classList.toggle("opacity-50", currentPage === totalPages);
  
  // If no results
  if (totalItems === 0) {
    showNoResults();
    return;
  }
  
  // Get current page items
  const pageItems = filteredBookings.slice(startIndex, endIndex);
  
  // Render table rows
  pageItems.forEach((booking, index) => {
    const row = document.createElement("tr");
    row.className = index % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50";
    row.id = `booking-row-${booking.id}`;
    
    // Helper function to create a cell
    const createCell = (content, className = "") => {
      const cell = document.createElement("td");
      cell.className = `px-3 py-2 ${className}`;
      cell.innerHTML = content;
      return cell;
    };
    
    // Name cell
    row.appendChild(createCell(`
      <div class="flex items-center">
        <div class="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
          <i class="fas fa-user text-blue-600 text-sm"></i>
        </div>
        <div>
          <div class="font-medium text-gray-900 text-sm">${booking.name || "N/A"}</div>
          <div class="text-xs text-gray-500">ID: ${booking.id.substring(0, 6)}...</div>
        </div>
      </div>
    `));
    
    // Age/Gender cell - combined for simplicity
    const genderIcon = booking.gender?.toLowerCase() === "male" 
      ? '<i class="fas fa-mars text-blue-500 mr-1"></i>' 
      : booking.gender?.toLowerCase() === "female" 
        ? '<i class="fas fa-venus text-pink-500 mr-1"></i>' 
        : '<i class="fas fa-question text-gray-400 mr-1"></i>';
    
    row.appendChild(createCell(`
      <div class="text-sm">
        <span class="font-medium">${booking.age || "N/A"}</span> / 
        <span class="flex items-center inline-flex">
          ${genderIcon}${booking.gender || "N/A"}
        </span>
      </div>
    `));
    
    // Phone cell
    row.appendChild(createCell(`
      <div class="text-sm flex items-center">
        <i class="fas fa-phone text-gray-400 mr-1"></i>
        ${booking.phone || "N/A"}
      </div>
    `));
    
    // Symptoms cell
    const symptoms = booking.symptoms || "None specified";
    row.appendChild(createCell(`
      <div class="relative group">
        <div class="text-sm max-w-xs truncate">
          ${symptoms.substring(0, 20)}${symptoms.length > 20 ? '...' : ''}
        </div>
        <div class="absolute z-10 invisible group-hover:visible bg-black text-white p-2 rounded shadow-lg text-xs mt-1 max-w-xs">
          ${symptoms}
        </div>
      </div>
    `));
    
    // Slot cell
    row.appendChild(createCell(`
      <div class="text-sm">${booking.slotDisplay}</div>
    `));
    // Booking time cell with priority
const bookingDate = booking.bookingDate || "";
const bookingTime = booking.bookingTime || "Not recorded";

// Priority number based on booking order
const priorityNumber = startIndex + index + 1;
const priorityClass = priorityNumber <= 3 
  ? "bg-red-100 text-red-800" 
  : priorityNumber <= 10 
    ? "bg-yellow-100 text-yellow-800" 
    : "bg-gray-100 text-gray-800";

row.appendChild(createCell(`
  <div class="text-sm">
    <div>${bookingDate}</div>
    <div>${bookingTime}</div>
    <span class="px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityClass}">
      Priority: ${priorityNumber}
    </span>
  </div>
`));

    
    // Payment cell
    const paymentStatus = booking.paymentStatus || "pending";
    const paymentMode = booking.paymentMode || "N/A";
    const paymentStatusClass = paymentStatus === "paid" 
      ? "bg-green-100 text-green-800" 
      : "bg-yellow-100 text-yellow-800";
    
    row.appendChild(createCell(`
      <div>
        <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${paymentStatusClass}">
          ${paymentStatus}
        </span>
        <div class="text-xs text-gray-500 mt-1">${paymentMode}</div>
      </div>
    `));
    
    // Appointment time cell
    const appointmentTime = booking.appointmentTime || "Not assigned";
    const appointmentStatusClass = booking.appointmentTime 
      ? "text-green-600" 
      : "text-gray-400";
    const timeIcon = booking.appointmentTime 
      ? '<i class="fas fa-clock mr-1"></i>' 
      : '<i class="fas fa-times-circle mr-1"></i>';
    
    row.appendChild(createCell(`
      <div class="text-sm ${appointmentStatusClass}">
        ${timeIcon}${appointmentTime}
      </div>
    `));
    
    // Actions cell
    const actionCell = document.createElement("td");
    actionCell.className = "px-3 py-2 text-center";
    
    // Create actions dropdown
    const actionsDropdown = document.createElement("div");
    actionsDropdown.className = "relative inline-block text-left";
    actionsDropdown.innerHTML = `
      <button id="dropdown-btn-${booking.id}" class="inline-flex justify-center rounded-md px-2 py-1 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
        <i class="fas fa-ellipsis-v"></i>
      </button>
      <div id="dropdown-menu-${booking.id}" class="hidden origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
        <div class="py-1" role="menu" aria-orientation="vertical">
          ${booking.paymentStatus !== "paid" ? `
            <button id="mark-paid-${booking.id}" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
              <i class="fas fa-check-circle text-green-500 mr-2"></i> Mark as Paid
            </button>
          ` : ''}
          ${!booking.appointmentTime ? `
            <button id="assign-time-${booking.id}" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
              <i class="fas fa-clock text-blue-500 mr-2"></i> Assign Time
            </button>
          ` : `
            <button id="edit-time-${booking.id}" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
              <i class="fas fa-edit text-yellow-500 mr-2"></i> Edit Time
            </button>
          `}
          <button id="whatsapp-${booking.id}" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
            <i class="fab fa-whatsapp text-green-500 mr-2"></i> WhatsApp
          </button>
          <button id="call-${booking.id}" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
            <i class="fas fa-phone text-blue-500 mr-2"></i> Call
          </button>
          <hr class="my-1">
          <button id="delete-${booking.id}" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700">
            <i class="fas fa-trash-alt mr-2"></i> Delete
          </button>
        </div>
      </div>
    `;
    
    actionCell.appendChild(actionsDropdown);
    row.appendChild(actionCell);
    bookingsBody.appendChild(row);
    
    // Handle dropdown toggle
    document.getElementById(`dropdown-btn-${booking.id}`).addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = document.getElementById(`dropdown-menu-${booking.id}`);
      
      // Close all other open menus
      document.querySelectorAll('[id^="dropdown-menu-"]').forEach(elem => {
        if (elem.id !== `dropdown-menu-${booking.id}`) {
          elem.classList.add("hidden");
        }
      });
      
      // Toggle current menu
      menu.classList.toggle("hidden");
    });
    
    // Add click event listeners for dropdown actions
    if (booking.paymentStatus !== "paid") {
      document.getElementById(`mark-paid-${booking.id}`).addEventListener("click", async () => {
        try 
        {
          await updateDoc(doc(db, "patients", booking.id), { 
            paymentStatus: "paid" 
          });
          
          showNotification("Payment marked as paid successfully!", "success");
          
          // Update local data
          booking.paymentStatus = "paid";
          
          // Refresh the row
          document.getElementById(`dropdown-menu-${booking.id}`).classList.add("hidden");
          const paymentCell = row.querySelector("td:nth-child(6)");
          paymentCell.innerHTML = `
            <div>
              <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                paid
              </span>
              <div class="text-xs text-gray-500 mt-1">${booking.paymentMode}</div>
            </div>
          `;
          
          // Update dropdown
          updateDropdownAfterPayment(booking.id, booking);
          
          // Update stats
          updateBookingStats(allBookings);
          
        } catch (error) {
          console.error("Error updating payment:", error);
          showNotification("Error updating payment status.", "error");
        }
      });
    }
    
    // Assign time event
    if (!booking.appointmentTime) {
      document.getElementById(`assign-time-${booking.id}`).addEventListener("click", () => {
        showTimeAssignmentModal(booking);
      });
    } else {
      document.getElementById(`edit-time-${booking.id}`).addEventListener("click", () => {
        showTimeAssignmentModal(booking, true);
      });
    }
    
    // WhatsApp event
    document.getElementById(`whatsapp-${booking.id}`).addEventListener("click", () => {
      if (!booking.phone) {
        showNotification("No phone number available for this patient.", "error");
        return;
      }
      
      // Clean phone number (remove spaces, dashes, etc.)
      const phone = booking.phone.replace(/\D/g, '');
      
      // Prepare message
      let message = `Hello ${booking.name || 'there'},\n\nRegarding your appointment`;
      
      if (booking.appointmentTime) {
        message += ` scheduled for ${booking.appointmentTime}`;
      }
      
      if (booking.slotDisplay) {
        message += ` on ${booking.slotDisplay.split('|')[0].trim()}`;
      }
      
      message += ".\n\nThank you.\nDoctor's Office";
      
      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);
      
      // Open WhatsApp link
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    });
    
    // Call patient event
    document.getElementById(`call-${booking.id}`).addEventListener("click", () => {
      if (!booking.phone) {
        showNotification("No phone number available for this patient.", "error");
        return;
      }
      
      // Clean phone number
      const phone = booking.phone.replace(/\D/g, '');
      
      // Open phone link
      window.location.href = `tel:${phone}`;
    });
    
    // Delete appointment event
    document.getElementById(`delete-${booking.id}`).addEventListener("click", async () => {
      showDeleteConfirmationModal(booking);
    });
  });
  
  // Close dropdown when clicking elsewhere
  document.addEventListener("click", () => {
    document.querySelectorAll('[id^="dropdown-menu-"]').forEach(menu => {
      menu.classList.add("hidden");
    });
  });
}

// Helper function to update dropdown after marking payment as paid
function updateDropdownAfterPayment(bookingId, booking) {
  const actionCell = document.querySelector(`#booking-row-${bookingId} td:last-child`);
  if (!actionCell) return;
  
  actionCell.innerHTML = "";
  const actionsDropdown = document.createElement("div");
  actionsDropdown.className = "relative inline-block text-left";
  actionsDropdown.innerHTML = `
    <button id="dropdown-btn-${bookingId}" class="inline-flex justify-center rounded-md px-2 py-1 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none">
      <i class="fas fa-ellipsis-v"></i>
    </button>
    <div id="dropdown-menu-${bookingId}" class="hidden origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
      <div class="py-1" role="menu" aria-orientation="vertical">
        ${!booking.appointmentTime ? `
          <button id="assign-time-${bookingId}" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
            <i class="fas fa-clock text-blue-500 mr-2"></i> Assign Time
          </button>
        ` : `
          <button id="edit-time-${bookingId}" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
            <i class="fas fa-edit text-yellow-500 mr-2"></i> Edit Time
          </button>
        `}
        <button id="whatsapp-${bookingId}" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
          <i class="fab fa-whatsapp text-green-500 mr-2"></i> WhatsApp
        </button>
        <button id="call-${bookingId}" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900">
          <i class="fas fa-phone text-blue-500 mr-2"></i> Call
        </button>
        <hr class="my-1">
        <button id="delete-${bookingId}" class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700">
          <i class="fas fa-trash-alt mr-2"></i> Delete
        </button>
      </div>
    </div>
  `;
  actionCell.appendChild(actionsDropdown);
  
  // Add event listeners
  document.getElementById(`dropdown-btn-${bookingId}`).addEventListener("click", (e) => {
    e.stopPropagation();
    const menu = document.getElementById(`dropdown-menu-${bookingId}`);
    
    // Close all other open menus
    document.querySelectorAll('[id^="dropdown-menu-"]').forEach(elem => {
      if (elem.id !== `dropdown-menu-${bookingId}`) {
        elem.classList.add("hidden");
      }
    });
    
    // Toggle current menu
    menu.classList.toggle("hidden");
  });
  
  // Re-add event listeners to the dropdown options
  if (!booking.appointmentTime) {
    document.getElementById(`assign-time-${bookingId}`).addEventListener("click", () => {
      showTimeAssignmentModal(booking);
    });
  } else {
    document.getElementById(`edit-time-${bookingId}`).addEventListener("click", () => {
      showTimeAssignmentModal(booking, true);
    });
  }
  
  document.getElementById(`whatsapp-${bookingId}`).addEventListener("click", () => {
    if (!booking.phone) {
      showNotification("No phone number available for this patient.", "error");
      return;
    }
    
    const phone = booking.phone.replace(/\D/g, '');
    let message = `Hello ${booking.name || 'there'},\n\nRegarding your appointment`;
    
    if (booking.appointmentTime) {
      message += ` scheduled for ${booking.appointmentTime}`;
    }
    
    if (booking.slotDisplay) {
      message += ` on ${booking.slotDisplay.split('|')[0].trim()}`;
    }
    
    message += ".\n\nThank you.\nDoctor's Office";
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
  });
  
  document.getElementById(`call-${bookingId}`).addEventListener("click", () => {
    if (!booking.phone) {
      showNotification("No phone number available for this patient.", "error");
      return;
    }
    
    const phone = booking.phone.replace(/\D/g, '');
    window.location.href = `tel:${phone}`;
  });
  
  document.getElementById(`delete-${bookingId}`).addEventListener("click", async () => {
    showDeleteConfirmationModal(booking);
  });
}

// Time assignment modal
function showTimeAssignmentModal(booking, isEdit = false) {
  // Close any open dropdowns
  document.querySelectorAll('[id^="dropdown-menu-"]').forEach(menu => {
    menu.classList.add("hidden");
  });
  
  // Create modal
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50";
  
  const modalContent = document.createElement("div");
  modalContent.className = "bg-white rounded-lg shadow-xl max-w-md w-full";
  
  modalContent.innerHTML = `
    <div class="bg-blue-600 text-white px-4 py-3 rounded-t-lg">
      <h3 class="text-lg font-medium">${isEdit ? 'Edit' : 'Assign'} Appointment Time</h3>
      <p class="text-sm text-blue-100">Patient: ${booking.name || 'N/A'}</p>
    </div>
    <div class="p-4">
      <form id="time-assignment-form" class="space-y-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1" for="appointment-time">
            Appointment Time
          </label>
          <input 
            type="text" 
            id="appointment-time" 
            class="w-full border border-gray-300 rounded-md px-3 py-2" 
            placeholder="e.g., 09:00 AM - 09:30 AM"
            value="${booking.appointmentTime || ''}" 
            required
          />
          <p class="text-xs text-gray-500 mt-1">Format: HH:MM AM/PM - HH:MM AM/PM</p>
        </div>
        
        <div class="flex items-start mt-3">
          <div class="flex items-center h-5">
            <input id="send-notification" type="checkbox" class="h-4 w-4 text-blue-600 border-gray-300 rounded">
          </div>
          <div class="ml-3 text-sm">
            <label for="send-notification" class="font-medium text-gray-700">Send WhatsApp notification</label>
            <p class="text-gray-500 text-xs">Automatically notify the patient via WhatsApp</p>
          </div>
        </div>
        
        <div class="flex justify-end space-x-2 pt-3 border-t">
          <button type="button" id="cancel-modal" class="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200">
            Cancel
          </button>
          <button type="submit" class="px-3 py-1 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
            ${isEdit ? 'Update' : 'Assign'} Time
          </button>
        </div>
      </form>
    </div>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Close modal
  document.getElementById("cancel-modal").addEventListener("click", () => {
    modalOverlay.remove();
  });
  
  // Handle form submission
  document.getElementById("time-assignment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const newTime = document.getElementById("appointment-time").value;
    const sendNotification = document.getElementById("send-notification").checked;
    
    try {
      // Update appointment time
      await updateDoc(doc(db, "patients", booking.id), { 
        appointmentTime: newTime 
      });
      
      // Update local data
      booking.appointmentTime = newTime;
      
      // Update row
      const row = document.getElementById(`booking-row-${booking.id}`);
      const timeCell = row.querySelector("td:nth-child(7)");
      timeCell.innerHTML = `
        <div class="text-sm text-green-600">
          <i class="fas fa-clock mr-1"></i>${newTime}
        </div>
      `;
      
      showNotification(`Appointment time ${isEdit ? 'updated' : 'assigned'} successfully!`, "success");
      
      // Update the dropdown to show edit option instead of assign
      if (!isEdit) {
        updateDropdownAfterTimeAssigned(booking.id, booking);
      }
      
      // Send WhatsApp notification if requested
      if (sendNotification && booking.phone) {
        const phone = booking.phone.replace(/\D/g, '');
        const message = `Hello ${booking.name || 'there'},\n\nYour appointment has been ${isEdit ? 'rescheduled' : 'scheduled'} for ${newTime} on ${booking.slotDisplay?.split('|')[0].trim() || 'the requested date'}.\n\nThank you.\nDoctor's Office`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
      }
      
      // Close modal
      modalOverlay.remove();
      
      // Update stats
      updateBookingStats(allBookings);
      
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'assigning'} time:`, error);
      showNotification(`Error ${isEdit ? 'updating' : 'assigning'} appointment time.`, "error");
    }
  });
}

// Helper function to update dropdown after assigning time
function updateDropdownAfterTimeAssigned(bookingId, booking) {
  const actionCell = document.querySelector(`#booking-row-${bookingId} td:last-child`);
  if (!actionCell) return;
  
  const dropdown = actionCell.querySelector(".relative");
  if (!dropdown) return;
  
  // Update the assign time button to edit time
  const menu = dropdown.querySelector(`#dropdown-menu-${bookingId}`);
  const assignTimeBtn = menu.querySelector(`#assign-time-${bookingId}`);
  
  if (assignTimeBtn) {
    assignTimeBtn.id = `edit-time-${bookingId}`;
    assignTimeBtn.innerHTML = `
      <i class="fas fa-edit text-yellow-500 mr-2"></i> Edit Time
    `;
    
    // Update event listener
    assignTimeBtn.removeEventListener("click", () => {});
    assignTimeBtn.addEventListener("click", () => {
      showTimeAssignmentModal(booking, true);
    });
  }
}

// Delete confirmation modal
function showDeleteConfirmationModal(booking) {
  // Close any open dropdowns
  document.querySelectorAll('[id^="dropdown-menu-"]').forEach(menu => {
    menu.classList.add("hidden");
  });
  
  // Create modal
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50";
  
  const modalContent = document.createElement("div");
  modalContent.className = "bg-white rounded-lg shadow-xl max-w-md w-full";
  
  modalContent.innerHTML = `
    <div class="bg-red-600 text-white px-4 py-3 rounded-t-lg">
      <h3 class="text-lg font-medium">Confirm Deletion</h3>
      <p class="text-sm text-red-100">This action cannot be undone</p>
    </div>
    <div class="p-4">
      <div class="flex items-center text-red-600 mb-3">
        <i class="fas fa-exclamation-triangle text-2xl mr-3"></i>
        <div>
          <p class="font-medium">Are you sure you want to delete this appointment?</p>
          <p class="text-gray-600 text-sm">Patient: ${booking.name || 'N/A'}</p>
        </div>
      </div>
      
      <div class="bg-gray-50 p-3 rounded-md text-sm text-gray-600 mb-3">
        <p><i class="fas fa-info-circle text-blue-500 mr-1"></i> This will permanently remove the appointment from the system.</p>
      </div>
      
      <div class="flex justify-end space-x-2 pt-3 border-t">
        <button type="button" id="cancel-delete" class="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200">
          Cancel
        </button>
        <button type="button" id="confirm-delete" class="px-3 py-1 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">
          Delete Appointment
        </button>
      </div>
    </div>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // Close modal
  document.getElementById("cancel-delete").addEventListener("click", () => {
    modalOverlay.remove();
  });
  
  // Handle delete confirmation
  document.getElementById("confirm-delete").addEventListener("click", async () => {
    try {
      await deleteDoc(doc(db, "patients", booking.id));
      
      // Also update the slot to remove this patient if needed
      if (booking.slotId) {
        const slotRef = doc(db, "slots", booking.slotId);
        const slotSnap = await getDoc(slotRef);
        
        if (slotSnap.exists()) {
          const slotData = slotSnap.data();
          const bookedPatients = slotData.bookedPatients || [];
          const updatedPatients = bookedPatients.filter(id => id !== booking.id);
          
          await updateDoc(slotRef, {
            bookedPatients: updatedPatients
          });
        }
      }
      
      // Remove from local data
      const index = allBookings.findIndex(b => b.id === booking.id);
      if (index > -1) {
        allBookings.splice(index, 1);
      }
      
      const filteredIndex = filteredBookings.findIndex(b => b.id === booking.id);
      if (filteredIndex > -1) {
        filteredBookings.splice(filteredIndex, 1);
      }
      
      showNotification("Appointment deleted successfully!", "success");
      
      // Close modal
      modalOverlay.remove();
      
      // Re-render table
      renderBookingsTable();
      
      // Update stats
      updateBookingStats(allBookings);
      
    } catch (error) {
      console.error("Error deleting appointment:", error);
      showNotification("Error deleting appointment.", "error");
    }
  });
}

// Function to fetch and manage slot list
async function fetchManageSlots() {
  try {
    // Show loading state
    const slotsBody = document.getElementById("slots-body");
    slotsBody.innerHTML = '<tr><td colspan="5" class="text-center py-3"><i class="fas fa-spinner fa-spin mr-2"></i> Loading slots...</td></tr>';
    
    const slotsSnapshot = await getDocs(collection(db, "slots"));
    slotsBody.innerHTML = "";
    
    if (slotsSnapshot.empty) {
      slotsBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-gray-500">No slots created yet</td></tr>';
      return;
    }
    
    // Create an array to sort slots by date
    const slots = [];
    slotsSnapshot.forEach(docSnapshot => {
      slots.push({
        id: docSnapshot.id,
        ...docSnapshot.data()
      });
    });
    
    // Sort slots by date (newest first)
    slots.sort((a, b) => {
      return new Date(b.date) - new Date(a.date);
    });
    
    slots.forEach(slot => {
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      
      // Date cell with formatted date
      const dateCell = document.createElement("td");
      dateCell.className = "px-4 py-2 whitespace-nowrap";
      
      // Format date to be more readable
      const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
      };
      
      dateCell.innerHTML = `
        <div class="flex items-center">
          <div class="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center mr-2">
            <i class="fas fa-calendar-day text-blue-500 text-sm"></i>
          </div>
          <div>
            <div class="text-sm font-medium text-gray-900">${formatDate(slot.date)}</div>
            <div class="text-xs text-gray-500">${slot.date}</div>
          </div>
        </div>
      `;
      
      // Time cell
      const timeCell = document.createElement("td");
      timeCell.className = "px-4 py-2 whitespace-nowrap";
      timeCell.innerHTML = `
        <div class="text-sm text-gray-900">${slot.openingTime} - ${slot.closingTime}</div>
      `;
      
      // Capacity cell with progress bar
      const capacityCell = document.createElement("td");
      capacityCell.className = "px-4 py-2 whitespace-nowrap";
      const bookedCount = slot.bookedPatients ? slot.bookedPatients.length : 0;
      const capacityPercentage = Math.round((bookedCount / slot.maxPatients) * 100);
      
      capacityCell.innerHTML = `
        <div class="text-sm text-gray-900 mb-1">${bookedCount}/${slot.maxPatients}</div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div class="bg-blue-600 h-2 rounded-full" style="width: ${capacityPercentage}%"></div>
        </div>
      `;
      
      // Status cell with badge
      const statusCell = document.createElement("td");
      statusCell.className = "px-4 py-2 whitespace-nowrap";
      const statusClass = slot.visible 
        ? "bg-green-100 text-green-800" 
        : "bg-gray-100 text-gray-800";
      statusCell.innerHTML = `
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
          ${slot.visible ? "Visible" : "Hidden"}
        </span>
      `;
      
      // Actions cell
      const actionCell = document.createElement("td");
      actionCell.className = "px-4 py-2 whitespace-nowrap text-right text-sm font-medium";
      
      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "text-yellow-600 hover:text-yellow-900 mr-3";
      editBtn.innerHTML = '<i class="fas fa-edit"></i>';
      editBtn.title = "Edit Slot";
      editBtn.addEventListener("click", async () => {
        try {
          // Create a modal for editing
          const modal = document.createElement("div");
          modal.className = "fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50";
          modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
              <h3 class="text-lg font-semibold mb-3">Edit Slot</h3>
              <form id="edit-slot-form" class="space-y-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" id="edit-date" class="w-full border p-2 rounded-md" value="${slot.date}" required>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
                    <input type="text" id="edit-opening" class="w-full border p-2 rounded-md" value="${slot.openingTime}" required>
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
                    <input type="text" id="edit-closing" class="w-full border p-2 rounded-md" value="${slot.closingTime}" required>
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Max Patients</label>
                  <input type="number" id="edit-max" class="w-full border p-2 rounded-md" value="${slot.maxPatients}" required>
                </div>
                <div class="flex justify-end space-x-2 pt-3">
                  <button type="button" id="cancel-edit" class="px-3 py-1 bg-gray-200 text-gray-800 rounded-md">Cancel</button>
                  <button type="submit" class="px-3 py-1 bg-blue-600 text-white rounded-md">Save Changes</button>
                </div>
              </form>
            </div>
          `;
          
          document.body.appendChild(modal);
          
          // Set up event listeners
          document.getElementById("cancel-edit").addEventListener("click", () => {
            modal.remove();
          });
          
          const editForm = document.getElementById("edit-slot-form");
          editForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const newDate = document.getElementById("edit-date").value;
            const newOpening = document.getElementById("edit-opening").value;
            const newClosing = document.getElementById("edit-closing").value;
            const newMax = parseInt(document.getElementById("edit-max").value, 10);
            
            try {
              await updateDoc(doc(db, "slots", slot.id), {
                date: newDate,
                openingTime: newOpening,
                closingTime: newClosing,
                maxPatients: newMax
              });
              
              showNotification("Slot updated successfully!", "success");
              modal.remove();
              await fetchManageSlots();
            } catch (error) {
              console.error("Error updating slot:", error);
              showNotification("Error updating slot.", "error");
            }
          });
          
        } catch (error) {
          console.error("Error opening edit modal:", error);
          showNotification("Error editing slot.", "error");
        }
      });
      actionCell.appendChild(editBtn);
      
      // Toggle visibility button
      const toggleBtn = document.createElement("button");
      toggleBtn.className = slot.visible 
        ? "text-gray-600 hover:text-gray-900 mr-3" 
        : "text-green-600 hover:text-green-900 mr-3";
      toggleBtn.innerHTML = slot.visible 
        ? '<i class="fas fa-eye-slash"></i>' 
        : '<i class="fas fa-eye"></i>';
      toggleBtn.title = slot.visible ? "Hide Slot" : "Show Slot";
      toggleBtn.addEventListener("click", async () => {
        try {
          await updateDoc(doc(db, "slots", slot.id), { 
            visible: !slot.visible 
          });
          showNotification(`Slot ${slot.visible ? 'hidden' : 'shown'} successfully!`, "success");
          await fetchManageSlots();
        } catch (error) {
          console.error("Error toggling visibility:", error);
          showNotification("Error updating slot visibility.", "error");
        }
      });
      actionCell.appendChild(toggleBtn);
      
      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "text-red-600 hover:text-red-900";
      deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
      deleteBtn.title = "Delete Slot";
      deleteBtn.addEventListener("click", async () => {
        // Check if slot has bookings
        const hasBookings = slot.bookedPatients && slot.bookedPatients.length > 0;
        
        let confirmMessage = "Are you sure you want to delete this slot?";
        if (hasBookings) {
          confirmMessage = `⚠️ WARNING: This slot has ${slot.bookedPatients.length} active bookings. Deleting it will break the reference to these appointments. Are you sure you want to proceed?`;
        }
        
        if (confirm(confirmMessage)) {
          try {
            await deleteDoc(doc(db, "slots", slot.id));
            showNotification("Slot deleted successfully!", "success");
            await fetchManageSlots();
            await updateDashboardStats();
          } catch (error) {
            console.error("Error deleting slot:", error);
            showNotification("Error deleting slot.","error");
          }
        }
      });
      actionCell.appendChild(deleteBtn);
      
      // Append all cells to the row
      row.appendChild(dateCell);
      row.appendChild(timeCell);
      row.appendChild(capacityCell);
      row.appendChild(statusCell);
      row.appendChild(actionCell);
      
      // Add row to table
      slotsBody.appendChild(row);
    });
    
  } catch (error) {
    console.error("Error fetching slots:", error);
    const slotsBody = document.getElementById("slots-body");
    slotsBody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-red-500">Error loading slots. Please try again.</td></tr>';
  }
}

// Function to generate report
async function generateReport() {
  try {
    const startDate = document.getElementById("report-start-date").value;
    const endDate = document.getElementById("report-end-date").value;
    
    if (!startDate || !endDate) {
      showNotification("Please select both start and end dates.", "error");
      return;
    }
    
    // Show loading state
    document.getElementById("daily-report-body").innerHTML = `
      <tr>
        <td colspan="4" class="px-3 py-3 text-center">
          <div class="inline-block w-6 h-6 border-4 rounded-full text-blue-600 border-t-transparent animate-spin mb-2"></div>
          <p class="text-gray-500">Generating report...</p>
        </td>
      </tr>
    `;
    
    // Get all bookings
    const bookingsSnapshot = await getDocs(collection(db, "patients"));
    const allReportBookings = [];
    
    bookingsSnapshot.forEach(doc => {
      allReportBookings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Get all slots for date mapping
    const slotsSnap = await getDocs(collection(db, "slots"));
    const slotDateMap = {};
    
    slotsSnap.forEach(doc => {
      slotDateMap[doc.id] = doc.data().date;
    });
    
    // Add slot dates to bookings
    allReportBookings.forEach(booking => {
      booking.slotDate = slotDateMap[booking.slotId] || "";
    });
    
    // Filter bookings by date range
    const filteredBookings = allReportBookings.filter(booking => {
      const bookingDate = booking.slotDate;
      return bookingDate >= startDate && bookingDate <= endDate;
    });
    
    // Group bookings by date
    const bookingsByDate = {};
    
    filteredBookings.forEach(booking => {
      const date = booking.slotDate;
      if (!bookingsByDate[date]) {
        bookingsByDate[date] = [];
      }
      bookingsByDate[date].push(booking);
    });
    
    // Sort dates
    const sortedDates = Object.keys(bookingsByDate).sort();
    
    // Calculate statistics
    const totalAppointments = filteredBookings.length;
    const numberOfDays = sortedDates.length;
    const dailyAverage = numberOfDays > 0 ? (totalAppointments / numberOfDays).toFixed(1) : 0;
    
    // Find the day with most appointments
    let maxDay = { date: '-', count: 0 };
    sortedDates.forEach(date => {
      const count = bookingsByDate[date].length;
      if (count > maxDay.count) {
        maxDay = { date, count };
      }
    });
    
    // Calculate assumed revenue (you might want to adjust the amount)
    const consultationFee = 500; // Assuming ₹500 per consultation
    const revenue = totalAppointments * consultationFee;
    
    // Update statistics in the UI
    document.getElementById("report-total-count").textContent = totalAppointments;
    document.getElementById("report-daily-avg").textContent = dailyAverage;
    document.getElementById("report-max-day").textContent = maxDay.date !== '-' ? 
      `${formatDate(maxDay.date).split(',')[0]} (${maxDay.count})` : '-';
    document.getElementById("report-revenue").textContent = `₹${revenue.toLocaleString()}`;
    
    // Prepare data for chart
    const chartLabels = sortedDates.map(date => {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const chartData = sortedDates.map(date => bookingsByDate[date].length);
    
    // Create chart
    renderChart(chartLabels, chartData);
    
    // Create a table showing day-wise appointments
    const tableBody = document.getElementById("daily-report-body");
    tableBody.innerHTML = '';
    
    if (sortedDates.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="4" class="px-3 py-3 text-center text-gray-500">
            No appointments found in the selected date range
          </td>
        </tr>
      `;
      return;
    }
    
    sortedDates.forEach(date => {
      const bookings = bookingsByDate[date];
      const row = document.createElement("tr");
      row.className = "hover:bg-gray-50";
      
      // Calculate gender distribution
      const genderDist = { male: 0, female: 0, other: 0 };
      bookings.forEach(booking => {
        const gender = booking.gender ? booking.gender.toLowerCase() : 'other';
        if (gender === 'male') genderDist.male++;
        else if (gender === 'female') genderDist.female++;
        else genderDist.other++;
      });
      
      // Calculate payment distribution
      const paymentDist = { paid: 0, pending: 0 };
      bookings.forEach(booking => {
        const status = booking.paymentStatus || 'pending';
        paymentDist[status]++;
      });
      
      // Create the row
      row.innerHTML = `
        <td class="px-3 py-2 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${formatDate(date)}</div>
        </td>
        <td class="px-3 py-2 whitespace-nowrap">
          <div class="text-sm font-medium text-gray-900">${bookings.length}</div>
        </td>
        <td class="px-3 py-2 whitespace-nowrap">
          <div class="flex items-center space-x-1">
            ${genderDist.male > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <i class="fas fa-mars mr-1"></i> ${genderDist.male}
              </span>
            ` : ''}
            ${genderDist.female > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                <i class="fas fa-venus mr-1"></i> ${genderDist.female}
              </span>
            ` : ''}
            ${genderDist.other > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <i class="fas fa-question mr-1"></i> ${genderDist.other}
              </span>
            ` : ''}
          </div>
        </td>
        <td class="px-3 py-2 whitespace-nowrap">
          <div class="flex items-center space-x-1">
            ${paymentDist.paid > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Paid: ${paymentDist.paid}
              </span>
            ` : ''}
            ${paymentDist.pending > 0 ? `
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Pending: ${paymentDist.pending}
              </span>
            ` : ''}
          </div>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
    
  } catch (error) {
    console.error("Error generating report:", error);
    showNotification("Error generating report. Please try again.", "error");
    document.getElementById("daily-report-body").innerHTML = `
      <tr>
        <td colspan="4" class="px-3 py-3 text-center text-red-500">
          Error generating report. Please try again.
        </td>
      </tr>
    `;
  }
}

// Function to render chart
function renderChart(labels, data) {
  const ctx = document.getElementById('daily-chart').getContext('2d');
  
  // Check if chart already exists and destroy it
  if (window.appointmentChart) {
    window.appointmentChart.destroy();
  }
  
  // Create new chart
  window.appointmentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Appointments',
        data: data,
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            title: function(tooltipItems) {
              return tooltipItems[0].label;
            },
            label: function(context) {
              return `Appointments: ${context.raw}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

// Helper function to show notifications
function showNotification(message, type = "info") {
  // Check if notification container exists, if not create it
  let notificationContainer = document.getElementById("notification-container");
  if (!notificationContainer) {
    notificationContainer = document.createElement("div");
    notificationContainer.id = "notification-container";
    notificationContainer.className = "fixed top-4 right-4 z-50 flex flex-col gap-2";
    document.body.appendChild(notificationContainer);
  }
  
  // Create notification element
  const notification = document.createElement("div");
  notification.className = "px-4 py-2 rounded-lg shadow-lg flex items-center max-w-xs transform translate-x-full opacity-0 transition-all duration-300";
  
  // Set colors based on type
  if (type === "success") {
    notification.classList.add("bg-green-500", "text-white");
    notification.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
  } else if (type === "error") {
    notification.classList.add("bg-red-500", "text-white");
    notification.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
  } else {
    notification.classList.add("bg-blue-500", "text-white");
    notification.innerHTML = `<i class="fas fa-info-circle mr-2"></i>${message}`;
  }
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.classList.remove("translate-x-full", "opacity-0");
  }, 10);
  
  // Auto close after delay
  setTimeout(() => {
    notification.classList.add("translate-x-full", "opacity-0");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}