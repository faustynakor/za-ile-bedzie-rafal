// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDmkKCkLAvQNKEGuvcGfSnUjlSo3iDKe_w",
  authDomain: "zailerafal.firebaseapp.com",
  databaseURL: "https://zailerafal-default-rtdb.firebaseio.com",
  projectId: "zailerafal",
  storageBucket: "zailerafal.firebasestorage.app",
  messagingSenderId: "995010930486",
  appId: "1:995010930486:web:ea6a93a2a33bb8593ef597"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function startCountdown(savedDate=null) {
    const meetingTime = savedDate || document.getElementById("meeting-time").value;
    if (!meetingTime) {
        alert("Wprowadź datę i godzinę spotkania!");
        return;
    }

    const meetingDate = new Date(meetingTime);
    const countdownElement = document.getElementById("countdown");

    function updateCountdown() {
        const now = new Date();
        const timeDifference = meetingDate - now;

        if (timeDifference <= 0) {
            countdownElement.textContent = "Spotkanie z Rafałem już trwa!";
            clearInterval(interval);
            return;
        }

        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

        countdownElement.textContent = 
            `Do spotkania z Rafałem pozostało: ${days} dni, ${hours} godzin, ${minutes} minut, ${seconds} sekund`;
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').then(() => {
        console.log("Service Worker zarejestrowany!");
    }).catch((error) => {
        console.error("Błąd rejestracji Service Workera: ", error);
    });
}


function saveDate(date) {
    const dateRef = ref(db, "meetingDate/");
    set(dateRef, {
      date: date,
    })
      .then(() => {
        console.log("Data saved successfully!");
      })
      .catch((error) => {
        console.error("Error saving data: ", error);
      });
  }

  function getDate() {
    const dateRef = ref(db, "meetingDate/date");
    get(dateRef)
    .then((snapshot) => {
        if (snapshot.exists()) {
            const savedDate = snapshot.val();
            console.log("Zapisana data: ", savedDate);
            startCountdown(savedDate); 
        } else {
            console.log("Brak zapisanej daty.");
        }
    })
    .catch((error) => {
        console.error("Błąd pobierania daty: ", error);
    });

    if (snapshot.exists()) {
        const savedDate = snapshot.val();
        console.log("Zapisana data: ", savedDate);
        document.getElementById("meeting-time").value = savedDate; // Ustaw wartość pola
        startCountdown(savedDate); // Rozpocznij odliczanie
    }
    
}

function setMeetingDate() {
    const dateInput = document.getElementById("meeting-time").value;
    if (dateInput) {
        saveDate(dateInput);
        alert("Data spotkania została zapisana!");
    } else {
        alert("Proszę podać datę!");
    }
}

document.addEventListener("DOMContentLoaded", getDate);