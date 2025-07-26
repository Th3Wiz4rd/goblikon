
const combatants = [];
let currentTurnIndex = 0;

let addCreatureForm;
let creatureNameInput;

document.addEventListener('DOMContentLoaded', () => {
    addCreatureForm = document.querySelector('add-creature-form');
    creatureNameInput = document.querySelector('creature-name-input');
    creatureMaxHp = document.querySelector('creature-max-hp');
    creatureAc = document.querySelector('creature-ac');
    creatureInitiative = document.querySelector('creature-initiative');
    creatureTypeSelect = document.querySelector('creature-type')
    addCreaturBtn = document.querySelector('add-creature-btn');
    preCombatList = document.querySelector('pre-combat-list');
    startCombatBtn = document.querySelector('start-combat-btn');
    combatTrackerSection = document.querySelector('combat-tracker-section');
    initiativeListContainer = document.querySelector('initiative-list-container');
    nextTurnBtn = document.querySelector('next-turn-btn');
    prevTurnBtn = document.querySelector('prev-turn-btn');
    currentTurnDisplay = document.querySelector('current-turn-display');
    battleMapCanvas = document.querySelector('battle-man-canvas');

    addCreatureForm.addEventListener('submit', handleAddCreature);
    initiativeListContainer.addEventListener('click', handleCombatantInteraction);
    nextTurnBtn.addEventListener('click', handleNextTurn);
    prevTurnBtn.addEventListener('click', handlePrecTurn);

    loadCombatantFromStorage(); //unsure how i will handle this, if web based itll need to have a cloud storage or maybe make a local version for folks to dl?
    renderPreCombatList();
});

function handleAddCreature(event) {
    event.preventDefault();

    const name = creatureNameInput.value.trim();
    const maxHp = parseInt(creatureMaxHp.value);
    const ac = parseInt(creatureAc.value);
    const initiative = parseInt(creatureInitiative);
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
        x: 0,
        y: 0,
        tokenColor: type === 'player' ? '#28a745' : '#dc3545'
    };
    
    combatants.push(newCombatant);
    console.log('Combatants array:', combatants);

    renderPreCombatList();

    addCreatureForm.reset();
    creatureNameInput.focus();
}
// this should work as intended, but i have some concerns about performance at this point. 
function renderPreCombatList() {
    preCombatList.innerHTML = '<h4>Creatures in Encounter:</h4>';

    if (combatants.length === 0){
        preCombatList.innerHTML += '<p>No creatures added yet.<p>';
        return;
    }

    const ul = document.createElement('ul');
    combatants.forEach(combatant => {
        const li = document.createElement('li');
        // something feels wrong with the function below for text content, i just cant figure it out. will need to run a quick test to see whats what. 
        li.textContent = `${combatant.name} (HP: ${combatant.maxHP}, Init: ${combatant.initiative})`;
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
        damangeInput.min = '1';
        damageInput.classList.add('hp-amount-input');

        const damageBtn = document.createElement('burron');
        damageBtn.textContent = 'Damage'
        damageBtn.dataset.id = combatant.id;
        damageBtn.dataset.action = 'damage';

        const healBtn = document.createElement('button');
        healBtn.textContent = 'Heal';
        healBtn.dataset.id = combatant.id;
        healBtn.dataset.action = 'damage';

        hpControls.appendChild(damageInput);
        hpControls.appendChild(damageBtn);
        hpControls.appendChild(healBtn);

        const conditionsEl = document.createElement('div');
        conditionsEl.classList.add('combatant-conditions');
        conditionsEl.textContent = `Conditions: ${combatant.conditions.join(', ') || 'None'}`;

        //Condition buttons
        const addConditionBtn = document.createElement('button');
        addConditionBtn.textContent = 'Add Condition';
        addConditionBtn.dataset.id = combatant.id;
        addConditionBtn.dataset.action = 'add-condition';

        combatantDiv.appendChild(nameEl);
        combatantDiv.appendChild(hpEl);
        combatantDiv.appendChild(hpControls);
        combatantDiv.appendChild(conditionsEl);
        combatantDiv.appendChild(addConditionBtn);
        // this should append properly, maybe an indent error here or there to debug.   
        initiativeListcontainer.appendChild(combatantDiv);
    });
}

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
        }
    } else if (target.matches('button[data-action="heal"]')) {
        const healInput = target.previousElementSibling.previousElementSibling;
        const amount = parseInt(healInput.value);
        if (!isNaN(amount) && amount > 0) {
            combatant.currentHP = Math.min(combatant.maxHP, combatant.currentHP + amount);
            renderInitiativeList();
        }
    } else if (target.matches('button[data-action="add-condition"]')) {
        const newCondition = prompt('Enter condition to add');
        if (newCondition && !combatant.conditiond.includes(newCondition.trim().toLowerCase())) {
            combatant.conditions.push(newCondition.trim().toLowerCase());
            renderInitiativeList();
        }
    } // add remove conditions and concentration things here
}

function handleNextTurn() {
    currentTurnIndex++;
    if (currentTurnIndex >= combatants.length) {
        currentTurnIndex = 0;
    }
    renderInitiativeList();
}

function handlePreviousTurn() {
    currentTurnIndex--;
    if (currentTurnIndex < 0) {
        currentTurnIndex = combatants.length - 1;
    }
    renderInitiativeList();
}

document.getElementById('start-combat-btn').addEventListener('click', () => {
    if (combatants.length === 0) {
        alert('Please add at least one creature before starting combat!');
        return;
    }
    currentTurnIndex = 0;
    renderInitiativeList();
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