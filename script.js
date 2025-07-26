
const combatants = [];
const GRID_SIZE = 40;
let currentTurnIndex = 0;

let addCreatureForm;
let creatureNameInput;
let creatureMaxHpInput; 
let creatureAcInput;   
let creatureInitiativeInput; 
let creatureTypeSelect;
let addCreatureBtn;

let preCombatList;
let startCombatBtn;
let combatTrackerSection; 
let initiativeListContainer;
let nextTurnBtn;
let prevTurnBtn;

let currentTurnDisplay;
let battleMapCanvas;
let ctx;
let isDragging = false;
let draggedCombatant = null;
let dragOffsetX, dragOffsetY;

document.addEventListener('DOMContentLoaded', () => {
    addCreatureForm = document.getElementById('add-creature-form');
    creatureNameInput = document.getElementById('creature-name'); 
    creatureMaxHpInput = document.getElementById('creature-max-hp');
    creatureAcInput = document.getElementById('creature-ac');
    creatureInitiativeInput = document.getElementById('creature-initiative');
    creatureTypeSelect = document.getElementById('creature-type');
    addCreatureBtn = document.getElementById('add-creature-btn');

    preCombatList = document.getElementById('pre-combat-list');
    startCombatBtn = document.getElementById('start-combat-btn');
    combatTrackerSection = document.getElementById('combat-tracker'); 
    initiativeListContainer = document.getElementById('initiative-list-container');
    nextTurnBtn = document.getElementById('next-turn-btn');
    prevTurnBtn = document.getElementById('prev-turn-btn');

    currentTurnDisplay = document.getElementById('current-turn-display');
    battleMapCanvas = document.getElementById('battle-map-canvas');
    battleMapCanvas.addEventListener('mousedown', handleMouseDown);
    battleMapCanvas.addEventListener('mousemove', handleMouseMove);
    battleMapCanvas.addEventListener('mouseup', handleMouseUp);
    battleMapCanvas.addEventListener('mouseleave', handleMouseUp);
    ctx = battleMapCanvas.getContext('2d');
    resetEncounterBtn = document.getElementById('reset-encounter-btn');

    addCreatureForm.addEventListener('submit', handleAddCreature);
    addCreatureBtn.addEventListener('click', handleAddCreature);

    initiativeListContainer.addEventListener('click', handleCombatantInteraction);
    nextTurnBtn.addEventListener('click', handleNextTurn);
    prevTurnBtn.addEventListener('click', handlePreviousTurn);
    resetEncounterBtn.addEventListener('click', handleResetEncounter);

    loadCombatantsFromStorage(); //unsure how i will handle this, if web based itll need to have a cloud storage or maybe make a local version for folks to dl?
    renderPreCombatList();
});

function handleAddCreature(event) {
    event.preventDefault();

    const name = creatureNameInput.value.trim();
    const maxHp = parseInt(creatureMaxHpInput.value);
    const ac = parseInt(creatureAcInput.value);
    const initiative = parseInt(creatureInitiativeInput.value);
    const type = creatureTypeSelect.value;

    if (!name || isNaN(maxHp) || maxHp <= 0 || isNaN(initiative)) {
        alert('Please enter valid Name, HP, and Initiative.');
        return;
    }

    const newCombatant = {
        id: Date.now().toString(),
        name: name,
        maxHP: maxHp,
        currentHP: maxHp,
        tempHP: 0,
        AC: ac, 
        initiative: initiative,
        conditions: [],
        isConcentrating: false,
        type: type,
        x: combatants.length % 10,
        y: Math.floor(combatants.length / 10),
        tokenColor: type === 'player' ? '#28a745' : '#dc3545'
    };
    
    combatants.push(newCombatant);
    console.log('Combatants array:', combatants);

    renderPreCombatList();

    addCreatureForm.reset();
    creatureNameInput.focus();

    saveCombatantsToStorage();
}
// this should work as intended, but i have some concerns about performance at this point. 
function renderPreCombatList() {
    preCombatList.innerHTML = '<h4>Creatures in Encounter:</h4>';

    if (combatants.length === 0){
        preCombatList.innerHTML += '<p>No creatures added yet.</p>';
        return;
    }

    const ul = document.createElement('ul');
    combatants.forEach(combatant => {
        const li = document.createElement('li');
         
        li.textContent = `${combatant.name} (HP: ${combatant.maxHP}, Init: ${combatant.initiative}, AC: ${combatant.AC})`;
        ul.appendChild(li);
    });

    preCombatList.appendChild(ul);

    startCombatBtn.style.display = 'block';
}

function renderInitiativeList() {
    document.getElementById('creature-setup').style.display = 'none';
    document.getElementById('combat-tracker').style.display = 'block';
    document.getElementById('visual-map-section').style.display = 'flex';

    initiativeListContainer.innerHTML = '';

    if (currentTurnIndex === 0) {
        combatants.sort((a, b) => {
            if (b.initiative !== a.initiative){
                return b.initiative - a.initiative;
            }

            return (b.dexModifier || 0) - (a.dexModifier || 0);
        });
    }

    combatants.forEach((combatant, index) => {
        const combatantDiv = document.createElement('div');
        combatantDiv.classList.add('combatant-item');
        combatantDiv.id = `combatant-${combatant.id}`;

        if (index === currentTurnIndex) {
            combatantDiv.classList.add('current-turn-highlight');
            currentTurnDisplay.textContent = `${combatant.name}'s Turn!`

        }

        const nameEl = document.createElement('h4');
        nameEl.classList.add('combatant-name');
        nameEl.textContent = combatant.name;

        const hpEl = document.createElement('p');
        hpEl.classList.add('combatant-hp');
        hpEl.textContent = `HP: ${combatant.currentHP} / ${combatant.maxHP}`;
        if (combatant.currentHP / combatant.maxHP < 0.3) {
            hpEl.classList.add('low-hp');
        }
        const hpControls = document.createElement('div');
        hpControls.classList.add('hp-controls');
        //buttons for damage, heal and input, weird thing on vs saying one of the damageInputs has something wrong? but doesnt show error, may need to debug, or it's nothig :P 
        const damageInput = document.createElement('input');
        damageInput.type = 'number';
        damageInput.value = '1';
        damageInput.min = '1';
        damageInput.classList.add('hp-amount-input');

        const damageBtn = document.createElement('button');
        damageBtn.textContent = 'Damage'
        damageBtn.dataset.id = combatant.id;
        damageBtn.dataset.action = 'damage';

        const healBtn = document.createElement('button');
        healBtn.textContent = 'Heal';
        healBtn.dataset.id = combatant.id;
        healBtn.dataset.action = 'heal';

        hpControls.appendChild(damageInput);
        hpControls.appendChild(damageBtn);
        hpControls.appendChild(healBtn);

        // this section was annoying....
        const conditionsContainer = document.createElement('div'); 
        conditionsContainer.classList.add('combatant-conditions-container');
        conditionsContainer.dataset.id = combatant.id;

        //Condition buttons
        if (combatant.conditions.length > 0) {
            combatant.conditions.forEach(condition => {
                const conditionBadge = document.createElement('span');
                conditionBadge.classList.add('condition-badge');
                conditionBadge.dataset.id = combatant.id;
                conditionBadge.dataset.condition = condition;

                const conditionText = document.createElement('span');
                conditionText.textContent = condition.charAt(0).toUpperCase() + condition.slice(1);

                const removeBtn = document.createElement('span');
                removeBtn.classList.add('remove-condition-btn');
                removeBtn.textContent = 'x';
                removeBtn.dataset.id = combatant.id;
                removeBtn.dataset.condition = condition;

                conditionBadge.appendChild(conditionText);
                conditionBadge.appendChild(removeBtn);
                conditionsContainer.appendChild(conditionBadge);
            });
        } else {
            const noConditionsText = document.createElement('span');
            noConditionsText.textContent = 'No Conditions';
            noConditionsText.style.fontStyle = 'italic';
            noConditionsText.style.color = '#888';
            conditionsContainer.appendChild(noConditionsText);
        }

        const addConditionBtn = document.createElement('button');
        addConditionBtn.textContent = 'Add Condition';
        addConditionBtn.dataset.id = combatant.id;
        addConditionBtn.dataset.action = 'add-condition'; // Make sure this matches the event listener


        // toggle
        const concentrationBtn = document.createElement('button');
        concentrationBtn.classList.add('toggle-concentration-btn');
        concentrationBtn.dataset.id = combatant.id;
        concentrationBtn.dataset.action = 'toggle-concentration'; 
        concentrationBtn.textContent = `Concentration: ${combatant.isConcentrating ? 'ON' : 'OFF'}`;

        if (combatant.isConcentrating) {
            concentrationBtn.classList.add('concentration-active');
        } else {
            concentrationBtn.classList.add('concentration-inactive');
        }

        combatantDiv.appendChild(nameEl);
        combatantDiv.appendChild(hpEl);
        combatantDiv.appendChild(hpControls);
        combatantDiv.appendChild(conditionsContainer);
        combatantDiv.appendChild(addConditionBtn);
        combatantDiv.appendChild(concentrationBtn);
        // Debug took 2 hours..   
        initiativeListContainer.appendChild(combatantDiv);
    });

    drawBattleMap();
}
// conditions may have an issue, will need to run tests 
function handleCombatantInteraction(event) {
    const target = event.target;
    const combatantId = target.dataset.id;

    if (!combatantId) return;

    const combatant = combatants.find(c => c.id === combatantId);
    if (!combatant) return;

    if (target.matches('button[data-action="damage"]')) {
        const damageInput = target.previousElementSibling;
        const amount = parseInt(damageInput.value);
        if (!isNaN(amount) && amount > 0) {
            combatant.currentHP = Math.max(0, combatant.currentHP - amount);
            renderInitiativeList();
            saveCombatantsToStorage();
        }
    } else if (target.matches('button[data-action="heal"]')) {
        const healInput = target.previousElementSibling.previousElementSibling;
        const amount = parseInt(healInput.value);
        if (!isNaN(amount) && amount > 0) {
            combatant.currentHP = Math.min(combatant.maxHP, combatant.currentHP + amount);
            renderInitiativeList();
            saveCombatantsToStorage();
        }
    } else if (target.matches('button[data-action="add-condition"]')) {
        const newCondition = prompt('Enter condition to add');
        if (newCondition && !combatant.conditions.includes(newCondition.trim().toLowerCase())) {
            combatant.conditions.push(newCondition.trim().toLowerCase());
            renderInitiativeList();
            saveCombatantsToStorage();
        }
    } else if (target.matches('.remove-condition-btn')) { // Targets the 'x' span
        const conditionToRemove = target.dataset.condition;
        combatant.conditions = combatant.conditions.filter(cond => cond !== conditionToRemove);
        renderInitiativeList();
        saveCombatantsToStorage(); // Save after condition change
    }
    else if (target.matches('button[data-action="toggle-concentration"]')) {
        combatant.isConcentrating = !combatant.isConcentrating; // Toggle boolean
        renderInitiativeList();
        saveCombatantsToStorage(); // Save after concentration change
    }
}


function handleNextTurn() {
    currentTurnIndex++;
    if (currentTurnIndex >= combatants.length) {
        currentTurnIndex = 0;
    }
    renderInitiativeList();
    saveCombatantsToStorage();
}

function handlePreviousTurn() {
    currentTurnIndex--;
    if (currentTurnIndex < 0) {
        currentTurnIndex = combatants.length - 1;
    }
    renderInitiativeList();
    saveCombatantsToStorage();
}

document.getElementById('start-combat-btn').addEventListener('click', () => {
    if (combatants.length === 0) {
        alert('Please add at least one creature before starting combat!');
        return;
    }
    currentTurnIndex = 0;
    renderInitiativeList();
    saveCombatantsToStorage();
});


function saveCombatantsToStorage() {
    localStorage.setItem('dndCombatants', JSON.stringify(combatants));
    localStorage.setItem('dndCurrentTurnIndex', currentTurnIndex.toString());
}

function loadCombatantsFromStorage() {
    const savedCombatants = localStorage.getItem('dndCombatants');
    const savedTurnIndex = localStorage.getItem('dndCurrentTurnIndex');
    if (savedCombatants) {
        combatants.push(...JSON.parse(savedCombatants));
    }
    if (savedTurnIndex) {
        currentTurnIndex = parseInt(savedTurnIndex);
    }
}

function handleResetEncounter() {
    if (!confirm('Are you sure you want to reset the encounter? All current combat data will be lost.')) {
        return; // User cancelled
    }

    combatants.length = 0;
    currentTurnIndex = 0;

    document.getElementById('combat-tracker').style.display = 'none';
    document.getElementById('visual-map-section').style.display = 'none';
    document.getElementById('creature-setup').style.display = 'block';

    renderPreCombatList();
    saveCombatantsToStorage();
}
// remembering how to draw in code was annoying lol. i hope it dont break. 
function drawBattleMap() {
    if (!battleMapCanvas || !ctx) {
        console.warn("Battle map canvas or context not found");
        return;
    }

    ctx.clearRect(0, 0, battleMapCanvas.width, battleMapCanvas.height);

    const width = battleMapCanvas.width;
    const height = battleMapCanvas.height;

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    for (let y = 0; y <= height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    combatants.forEach((combatant, index) => {
        const tokenRadius = (GRID_SIZE / 2) * 0.8;
        const drawX = combatant.x * GRID_SIZE + (GRID_SIZE / 2);
        const drawY = combatant.y * GRID_SIZE + (GRID_SIZE / 2);


        ctx.beginPath();
        ctx.arc(drawX, drawY, tokenRadius, 0, Math.PI * 2);

        ctx.fillStyle = combatant.tokenColor;
        ctx.fill();

        if (index === currentTurnIndex) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        ctx.fillStyle = 'white';
        ctx.font = `${tokenRadius * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const tokenText = combatant.name.substring(0,2).toUpperCase();
        ctx.fillText(tokenText, drawX, drawY);
    });
}

function handleMouseDown(event) {
    const rect = battleMapCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    for (let i = combatants.length - 1; i >= 0; i--) {
        const combatant = combatants[i];
        const tokenX = combatant.x * GRID_SIZE + (GRID_SIZE / 2);
        const tokenY = combatant.y * GRID_SIZE + (GRID_SIZE / 2);
        const tokenRadius = (GRID_SIZE / 2) * 0.8;

        const distance = Math.sqrt(
            Math.pow(mouseX - tokenX, 2) + Math.pow(mouseY - tokenY, 2)
        );

        if (distance < tokenRadius) {
            isDragging = true;
            draggedCombatant = combatant;

            dragOffsetX = mouseX - tokenX;
            dragOffsetY = mouseY - tokenY;

            combatants.splice(i, 1);
            combatants.push(draggedCombatant);

            drawBattleMap();
            return;
        }
    }
}

function handleMouseMove(event) {
    if (isDragging && draggedCombatant) {
        const rect = battleMapCanvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        let newGridX = Math.round((mouseX - dragOffsetX) / GRID_SIZE - 0.5);
        let newGridY = Math.round((mouseY - dragOffsetY) / GRID_SIZE - 0.5);

        newGridX = Math.max(0, Math.min(newGridX, Math.floor(battleMapCanvas.width / GRID_SIZE) - 1));
        newGridY = Math.max(0, Math.min(newGridY, Math.floor(battleMapCanvas.height / GRID_SIZE) - 1));

        
        if (draggedCombatant.x !== newGridX || draggedCombatant.y !== newGridY) {
            draggedCombatant.x = newGridX;
            draggedCombatant.y = newGridY;
            drawBattleMap();
        }
    }
}

function handleMouseUp(event) {
    if (isDragging) {
        isDragging = false;
        draggedCombatant = null;
        dragOffsetX = 0;
        dragOffsetY = 0;
        saveCombatantsToStorage();
    }
}