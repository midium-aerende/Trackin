const tasks = document.querySelectorAll('.task-bar');
let timers = {};
let activeTask = null;
let globalTime = 0;  // Temps global du jour en secondes
const historyKey = 'trackinHistory'; // Clé pour stocker l'historique des heures par jour

// Charger les données sauvegardées du localStorage
window.onload = () => {
  const savedTimers = JSON.parse(localStorage.getItem('trackinTimers')) || {};
  timers = { ...savedTimers };

  // Récupérer l'heure globale de la journée (en secondes)
  const savedGlobalTime = localStorage.getItem('globalTime');
  globalTime = savedGlobalTime ? parseInt(savedGlobalTime, 10) : 0;

  updateTimers();
  updateGlobalTime();

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

// Sauvegarder les minuteries et l'heure globale dans le localStorage
const saveTimers = () => {
  localStorage.setItem('trackinTimers', JSON.stringify(timers));
  localStorage.setItem('globalTime', globalTime.toString());
};

// Mettre à jour les minuteries dans l'interface
const updateTimers = () => {
  for (const taskId in timers) {
    const timerElement = document.getElementById(`timer-${taskId}`);
    if (timerElement) {
      timerElement.textContent = formatTime(timers[taskId].time || 0); // Afficher 0 si aucune minute
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
  // Exclure la pause du calcul de l'heure globale
  if (taskId === "pause") {
    if (!timers[taskId]) {
      timers[taskId] = { time: 0, intervalId: null };
    }
    if (!timers[taskId].intervalId) {
      timers[taskId].intervalId = setInterval(() => {
        timers[taskId].time += 1;
        updateTimers();
        saveTimers();
      }, 1000);
    }
    return; // Ne pas affecter l'heure globale lorsque la pause est active
  }

  if (activeTask && activeTask !== taskId) {
    clearInterval(timers[activeTask].intervalId);
  }

  if (!timers[taskId]) {
    timers[taskId] = { time: 0, intervalId: null };
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

// Ajouter un événement pour afficher l'historique des heures du mois
const viewHistory = () => {
  const history = JSON.parse(localStorage.getItem(historyKey)) || [];
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = ''; // Vider la liste avant de la remplir

  history.forEach((entry) => {
    const listItem = document.createElement('li');
    listItem.textContent = `${entry.date}: ${entry.time}`;
    historyList.appendChild(listItem);
  });

  document.getElementById('history-modal').style.display = 'flex';
};

// Sauvegarder l'historique des heures comptabilisées par jour
const saveHistory = () => {
  const currentDate = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  const timeFormatted = formatTime(globalTime);

  // Charger l'historique existant
  const history = JSON.parse(localStorage.getItem(historyKey)) || [];

  // Supprimer les anciennes entrées pour la même date
  const updatedHistory = history.filter(entry => entry.date !== currentDate);

  // Ajouter la nouvelle entrée avec la date actuelle
  updatedHistory.push({ date: currentDate, time: timeFormatted });

  // Sauvegarder l'historique mis à jour
  localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
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
