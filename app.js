// Importer les fonctions nécessaires de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-database.js";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBlwpQoOZmKHrWNIxdeWfCfcgdBDAr-Vy8",
  authDomain: "database-a9135.firebaseapp.com",
  databaseURL: "https://database-a9135-default-rtdb.firebaseio.com",
  projectId: "database-a9135",
  storageBucket: "database-a9135.firebasestorage.app",
  messagingSenderId: "728924033150",
  appId: "1:728924033150:web:0663f19cdb4f370da5482f",
  measurementId: "G-WR2S6NW2SH"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const tasks = document.querySelectorAll('.task-bar');
let timers = {};
let activeTask = null;
let globalTime = 0;  // Temps global du jour en secondes
const historyKey = 'trackinHistory'; // Clé pour stocker l'historique des heures par jour

// Charger les données sauvegardées de Firebase
window.onload = () => {
  const today = new Date().toISOString().split('T')[0]; // Date d'aujourd'hui au format YYYY-MM-DD

  // Charger les minuteries sauvegardées depuis Firebase
  const timersRef = ref(database, 'trackinTimers');
  get(timersRef).then((snapshot) => {
    if (snapshot.exists()) {
      timers = snapshot.val();
    } else {
      timers = {}; // Si aucune donnée de minuteries existantes, initialiser un objet vide
    }

    // Charger l'heure globale du jour depuis Firebase
    const globalTimeRef = ref(database, 'globalTime');
    get(globalTimeRef).then((snapshot) => {
      if (snapshot.exists()) {
        globalTime = snapshot.val();
      }

      // Vérifier si l'entrée pour la date actuelle existe dans l'historique
      const historyRef = ref(database, 'history/' + today);
      get(historyRef).then((snapshot) => {
        if (!snapshot.exists()) {
          // La date n'existe pas dans l'historique, réinitialiser les minuteries et l'heure globale à zéro
          resetDailyTimers(); // Réinitialiser les minuteries des tâches
          globalTime = 0; // Mettre globalTime à zéro en temps réel
          updateGlobalTime(); // Mettre à jour l'affichage de l'heure globale
        } else {
          // Si l'entrée existe dans l'historique, charger les minuteries et l'heure globale
          updateTimers(); // Mettre à jour l'affichage des minuteries des tâches
          updateGlobalTime(); // Mettre à jour l'affichage de l'heure globale
        }
      }).catch((error) => {
        console.error("Erreur lors de la récupération de l'historique : ", error);
      });

    }).catch((error) => {
      console.error("Erreur lors de la récupération de l'heure globale : ", error);
    });
  }).catch((error) => {
    console.error("Erreur lors de la récupération des minuteries : ", error);
  });

  // Ajouter les autres gestionnaires d'événements pour l'interface
  const resetButton = document.getElementById('reset-button');
  const viewHistoryButton = document.getElementById('view-history-button');
  const closeModalButton = document.getElementById('close-modal');

  const confirmationModal = document.getElementById('confirmation-modal');
  const confirmResetButton = document.getElementById('confirm-reset');
  const cancelResetButton = document.getElementById('cancel-reset');

  if (resetButton) {
    resetButton.addEventListener('click', confirmResetDailyTimers); // Afficher le modal de confirmation
  }

  if (viewHistoryButton) {
    viewHistoryButton.addEventListener('click', viewHistory);
  }

  if (closeModalButton) {
    closeModalButton.addEventListener('click', () => {
      document.getElementById('history-modal').style.display = 'none';
    });
  }

  // Gérer les événements pour le modal de confirmation
  if (confirmationModal) {
    confirmResetButton.addEventListener('click', () => {
      resetDailyTimers(); // Réinitialiser les minuteries
      confirmationModal.style.display = 'none'; // Fermer le modal
    });

    cancelResetButton.addEventListener('click', () => {
      confirmationModal.style.display = 'none'; // Fermer le modal si l'utilisateur annule
    });
  }
};

// Sauvegarder les minuteries et l'heure globale dans Firebase
const saveTimers = () => {
  set(ref(database, 'trackinTimers'), timers);
  set(ref(database, 'globalTime'), globalTime);
};

// Mettre à jour les minuteries dans l'interface
const updateTimers = () => {
  for (const taskId in timers) {
    const timerElement = document.getElementById(`timer-${taskId}`);
    if (timerElement) {
      const taskTimer = timers[taskId]; // Récupérer l'objet de minuterie de la tâche
      if (taskTimer && taskTimer.hasOwnProperty('time')) {
        timerElement.textContent = formatTime(taskTimer.time || 0); // Afficher 0 si aucune minute
      }
    }
  }
};

// Mettre à jour l'heure globale du jour dans l'interface
const updateGlobalTime = () => {
  document.getElementById('global-time').textContent = `Heure globale du jour : ${formatTime(globalTime)}`;
};

// Formatage du temps (secondes en HH:MM:SS)
const formatTime = (seconds) => {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
};

// Démarrer un minuteur pour une tâche
const startTimer = (taskId) => {
  // Vérifier si l'objet timer pour la tâche existe
  if (!timers[taskId]) {
    timers[taskId] = { time: 0, intervalId: null };
  }

  if (activeTask && activeTask !== taskId) {
    clearInterval(timers[activeTask].intervalId);
  }

  if (!timers[taskId].intervalId) {
    timers[taskId].intervalId = setInterval(() => {
      timers[taskId].time += 1;
      if (taskId !== "pause") {  // Ne pas inclure le temps de pause dans le global
        globalTime += 1;  // Incrémenter l'heure globale uniquement pour les tâches autres que "pause"
      }
      updateTimers();
      updateGlobalTime();
      saveTimers();
    }, 1000);
  }

  activeTask = taskId;
};

// Arrêter tous les minuteurs
const stopAllTimers = () => {
  for (const taskId in timers) {
    if (timers[taskId].intervalId) {
      clearInterval(timers[taskId].intervalId);
      timers[taskId].intervalId = null;
    }
  }
};

// Fonction pour confirmer la réinitialisation des minuteries
const confirmResetDailyTimers = () => {
  const confirmationModal = document.getElementById('confirmation-modal');
  if (confirmationModal) {
    confirmationModal.style.display = 'flex'; // Afficher le modal
  }
};

// Réinitialiser les minuteries des tâches et l'heure globale
const resetDailyTimers = () => {
  globalTime = 0; // Réinitialiser l'heure globale à 0

  // Réinitialiser les minuteries de toutes les tâches à zéro
  for (const taskId in timers) {
    timers[taskId].time = 0; // Réinitialiser le temps de chaque tâche à 0
    if (timers[taskId].intervalId) { // Si la tâche est en cours, arrêter le minuteur
      clearInterval(timers[taskId].intervalId);
      timers[taskId].intervalId = null; // Réinitialiser l'intervalle
    }
  }

  // Mettre à jour les affichages des minuteries et de l'heure globale
  updateTimers(); // Mise à jour immédiate des minuteries des tâches
  updateGlobalTime(); // Mise à jour immédiate de l'heure globale

  saveTimers();
};

const viewHistory = () => {
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = ''; // Vider la liste avant de la remplir

  // Référence vers la collection 'history' dans Firebase Realtime Database
  const historyRef = ref(database, 'history');

  // Récupérer l'historique depuis Firebase Realtime Database
  get(historyRef).then((snapshot) => {
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const entry = childSnapshot.val();
        const listItem = document.createElement('li');
        
        // Formater la date
        const formattedDate = new Date(entry.date).toLocaleDateString();  // Format de la date local
        
        // Créer un élément pour la date et l'heure globale
        const dateInfo = document.createElement('div');
        dateInfo.classList.add('history-date');
        dateInfo.innerHTML = `<span>${formattedDate}</span>
        <span>${entry.time}</span>`;
        
        // Créer un conteneur pour les tâches (accordéon)
        const tasksContainer = document.createElement('div');
        tasksContainer.classList.add('tasks-container');
        
        // Ajouter les tâches sous cette date
        if (entry.tasks) {
          for (const taskId in entry.tasks) {
            const task = entry.tasks[taskId];
            const taskItem = document.createElement('div');
            taskItem.classList.add('task-item');
            taskItem.innerHTML = `<span>${taskId} : </span><span>${task.time}</span>`;
            tasksContainer.appendChild(taskItem);
          }
        }

        // Ajouter un gestionnaire d'événements pour ouvrir/fermer les tâches lorsqu'on clique sur la date
        dateInfo.addEventListener('click', () => {
          tasksContainer.classList.toggle('open');
        });

        // Ajouter les éléments à la liste
        listItem.appendChild(dateInfo);
        listItem.appendChild(tasksContainer);
        historyList.appendChild(listItem);
      });
    } else {
      const noHistoryItem = document.createElement('li');
      noHistoryItem.textContent = "Aucun historique disponible.";
      historyList.appendChild(noHistoryItem);
    }

    document.getElementById('history-modal').style.display = 'flex';
  }).catch((error) => {
    console.error('Erreur lors de la récupération de l\'historique :', error);
  });
};

const saveHistory = () => {
  const currentDate = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  const timeFormatted = formatTime(globalTime);

  // Créer un objet pour stocker les tâches et leur temps
  const tasksData = {};
  for (const taskId in timers) {
    if (timers[taskId].time > 0) {
      tasksData[taskId] = { time: formatTime(timers[taskId].time) };
    }
  }

  // Référence vers l'historique dans la Realtime Database
  const historyRef = ref(database, 'history/' + currentDate);

  // Enregistrer l'entrée de l'historique avec les tâches dans Firebase Realtime Database
  set(historyRef, {
    date: currentDate,
    time: timeFormatted,
    tasks: tasksData // Ajouter les tâches et leur temps
  })
  .then(() => {
    console.log('Historique et tâches sauvegardés avec succès');
  })
  .catch((error) => {
    console.error('Erreur lors de la sauvegarde de l\'historique :', error);
  });
};

// Ajouter un événement pour sauvegarder l'historique chaque jour
window.addEventListener('beforeunload', saveHistory);

// Ajouter un événement pour démarrer une tâche au clic
tasks.forEach((task) => {
  if (task) {  // Vérifier si l'élément existe
    task.addEventListener('click', () => {
      const taskId = task.id;
      stopAllTimers();
      startTimer(taskId);
    });
  }
});
