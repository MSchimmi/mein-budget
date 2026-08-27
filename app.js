const KEY = "meinBudget_v3";

let state = loadState();


/* =========================
   DATEN LADEN
   ========================= */

function loadState() {
    try {
        const v3 = JSON.parse(
            localStorage.getItem("meinBudget_v3") || "null"
        );

        if (v3 && v3.budgets && Array.isArray(v3.expenses)) {
            return v3;
        }

        const v2 = JSON.parse(
            localStorage.getItem("meinBudget_v2") || "null"
        );

        if (v2 && v2.budgets && Array.isArray(v2.expenses)) {
            return v2;
        }

        const v1 = JSON.parse(
            localStorage.getItem("meinBudget_v1") || "null"
        );

        if (v1 && v1.budgets && Array.isArray(v1.expenses)) {
            return v1;
        }

    } catch (e) {
        console.error("Fehler beim Laden:", e);
    }

    return {
        period: "month",
        budgets: {},
        expenses: []
    };
}


/* =========================
   SPEICHERN
   ========================= */

function save() {
    try {
        localStorage.setItem(
            KEY,
            JSON.stringify(state)
        );
        return true;
    } catch (e) {
        alert(
            "Die Daten konnten auf diesem iPhone nicht gespeichert werden."
        );
        return false;
    }
}


/* =========================
   HILFSFUNKTIONEN
   ========================= */

const $ = id => document.getElementById(id);

const euro = n =>
    new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR"
    }).format(Number(n) || 0);

const pad = n =>
    String(n).padStart(2, "0");

function dateKey(d) {
    return (
        d.getFullYear() +
        "-" +
        pad(d.getMonth() + 1) +
        "-" +
        pad(d.getDate())
    );
}


/* =========================
   NÄCHSTER WERKTAG
   ========================= */

function nextWeekday(d) {
    const x = new Date(d);
    const day = x.getDay();

    if (day === 6) {
        x.setDate(x.getDate() + 2);
    }

    if (day === 0) {
        x.setDate(x.getDate() + 1);
    }

    return x;
}


/* =========================
   ZEITRAUM
   24. bis 23.
   ========================= */

function period() {

    const now = new Date();

    let year = now.getFullYear();
    let month = now.getMonth();

    let start = new Date(
        year,
        month,
        24
    );

    /*
       Wenn wir vor dem 24. sind,
       beginnt der aktuelle Zeitraum
       am 24. des Vormonats.
    */
    if (now < start) {
        start = new Date(
            year,
            month - 1,
            24
        );
    }

    /*
       24. am Wochenende:
       Beginn am darauffolgenden Montag.
    */
    start = nextWeekday(start);

    const end = new Date(
        start.getFullYear(),
        start.getMonth() + 1,
        23,
        23,
        59,
        59,
        999
    );

    return {
        key: "p_" + dateKey(start),
        start: start,
        end: end,
        label:
            start.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit"
            }) +
            " – " +
            end.toLocaleDateString("de-DE", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            })
    };
}


/* =========================
   AUSGABE IM ZEITRAUM
   ========================= */

function inPeriod(expense, p) {

    const d = new Date(
        expense.date + "T12:00:00"
    );

    return (
        d >= p.start &&
        d <= p.end
    );
}


/* =========================
   ID
   ========================= */

function newId() {

    return (
        "e_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}


/* =========================
   HTML ABSICHERN
   ========================= */

function esc(s) {

    return String(s || "").replace(
        /[&<>"']/g,
        c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[c])
    );
}


/* =========================
   ANZEIGE
   ========================= */

function render() {

    const p = period();

    const expenses =
        state.expenses.filter(
            x => inPeriod(x, p)
        );

    const spent =
        expenses.reduce(
            (sum, x) =>
                sum + Number(x.amount || 0),
            0
        );

    const budget =
        Number(
            state.budgets[p.key] || 0
        );

    const remaining =
        budget - spent;

    const now = new Date();

    const days =
        Math.max(
            1,
            Math.ceil(
                (p.end - now) /
                86400000
            )
        );


    /* Zeitraum */

    const periodLabel =
        $("periodLabel");

    if (periodLabel) {
        periodLabel.textContent =
            "Zeitraum: " + p.label;
    }


    /* Noch verfügbar */

    if ($("remaining")) {
        $("remaining").textContent =
            euro(remaining);
    }


    /* Pro Tag */

    if ($("daily")) {
        $("daily").textContent =
            `${euro(
                Math.max(
                    0,
                    remaining / days
                )
            )} pro Tag`;
    }


    /* Tage */

    if ($("days")) {
        $("days").textContent =
            `${days} ${
                days === 1
                    ? "Tag"
                    : "Tage"
            } verbleibend`;
    }


    /* Budget */

    if ($("budgetValue")) {
        $("budgetValue").textContent =
            euro(budget);
    }


    /* Ausgaben */

    if ($("spentValue")) {
        $("spentValue").textContent =
            euro(spent);
    }


    /* Fortschrittsbalken */

    if ($("progressBar")) {
        $("progressBar").style.width =
            budget
                ? Math.min(
                    100,
                    Math.max(
                        0,
                        spent / budget * 100
                    )
                ) + "%"
                : "0%";
    }


    /* =========================
       HEUTE
       ========================= */

    const today =
        dateKey(now);

    const todaySpent =
        state.expenses
            .filter(
                x => x.date === today
            )
            .reduce(
                (sum, x) =>
                    sum +
                    Number(
                        x.amount || 0
                    ),
                0
            );

    if ($("todayValue")) {
        $("todayValue").textContent =
            euro(todaySpent);
    }


    /* =========================
       AUSGABENLISTE
       ========================= */

    if ($("expenses")) {

        $("expenses").innerHTML =
            expenses
                .slice()
                .sort(
                    (a, b) =>
                        b.date.localeCompare(
                            a.date
                        )
                )
                .map(
                    x => `
                        <div class="expense">

                            <div class="expense-main">

                                <div class="expense-title">
                                    ${esc(x.category)}
                                </div>

                                <div class="expense-meta">
                                    ${new Date(
                                        x.date +
                                        "T12:00:00"
                                    ).toLocaleDateString(
                                        "de-DE"
                                    )}
                                    ${
                                        x.note
                                            ? " · " +
                                              esc(x.note)
                                            : ""
                                    }
                                </div>

                            </div>

                            <div class="expense-amount">
                                −${euro(x.amount)}
                            </div>

                            <div class="expense-actions">

                                <button
                                    onclick="editExpense('${x.id}')"
                                >
                                    ✎
                                </button>

                                <button
                                    onclick="deleteExpense('${x.id}')"
                                >
                                    ×
                                </button>

                            </div>

                        </div>
                    `
                )
                .join("")
            ||
            `
                <div class="empty">
                    Noch keine Ausgaben in diesem Zeitraum.
                </div>
            `;
    }
}


/* =========================
   BUDGET ÖFFNEN
   ========================= */

function openBudget() {

    const p = period();

    $("budgetInput").value =
        state.budgets[p.key] ?? "";

    $("budgetDialog").showModal();

    $("budgetInput").focus();
}


/* =========================
   BUDGET ANKLICKEN
   ========================= */

if ($("budgetValue")) {

    $("budgetValue").onclick =
        openBudget;
}


/* =========================
   BUDGET SPEICHERN
   ========================= */

if ($("budgetForm")) {

    $("budgetForm").addEventListener(
        "submit",
        e => {

            if (
                e.submitter &&
                e.submitter.value !== "save"
            ) {
                return;
            }

            const p = period();

            state.budgets[p.key] =
                Number(
                    $("budgetInput").value
                ) || 0;

            if (save()) {
                render();
            }
        }
    );
}


/* =========================
   NEUE AUSGABE
   ========================= */

if ($("addBtn")) {

    $("addBtn").onclick = () => {

        $("expenseTitle").textContent =
            "Neue Ausgabe";

        $("expenseId").value =
            "";

        $("expenseAmount").value =
            "";

        $("expenseNote").value =
            "";

        $("expenseCategory").value =
            "Lebensmittel";

        $("expenseDialog").showModal();

        $("expenseAmount").focus();
    };
}


/* =========================
   AUSGABE SPEICHERN
   ========================= */

if ($("expenseForm")) {

    $("expenseForm").addEventListener(
        "submit",
        e => {

            if (
                e.submitter &&
                e.submitter.value !== "save"
            ) {
                return;
            }

            const amount =
                Number(
                    $("expenseAmount").value
                );

            if (!amount) {
                return;
            }

            const id =
                $("expenseId").value;

            const expense = {
                id:
                    id || newId(),

                amount:

                    amount,

                category:
                    $("expenseCategory").value,

                note:
                    $("expenseNote")
                        .value
                        .trim(),

                date:
                    dateKey(
                        new Date()
                    )
            };


            if (id) {

                state.expenses =
                    state.expenses.map(
                        x =>
                            x.id === id
                                ? expense
                                : x
                    );

            } else {

                state.expenses.push(
                    expense
                );
            }


            if (save()) {
                render();
            }
        }
    );
}


/* =========================
   AUSGABE BEARBEITEN
   ========================= */

function editExpense(id) {

    const expense =
        state.expenses.find(
            x => x.id === id
        );

    if (!expense) {
        return;
    }

    $("expenseTitle").textContent =
        "Ausgabe bearbeiten";

    $("expenseId").value =
        expense.id;

    $("expenseAmount").value =
        expense.amount;

    $("expenseCategory").value =
        expense.category;

    $("expenseNote").value =
        expense.note || "";

    $("expenseDialog").showModal();
}


/* =========================
   AUSGABE LÖSCHEN
   ========================= */

function deleteExpense(id) {

    if (
        confirm(
            "Ausgabe wirklich löschen?"
        )
    ) {

        state.expenses =
            state.expenses.filter(
                x => x.id !== id
            );

        if (save()) {
            render();
        }
    }
}


/* =========================
   EINSTELLUNGEN
   ========================= */

if ($("settingsBtn")) {

    $("settingsBtn").onclick =
        () =>
            $("settingsDialog")
                .showModal();
}


/* =========================
   EXPORT
   ========================= */

if ($("exportBtn")) {

    $("exportBtn").onclick = () => {

        const blob =
            new Blob(
                [
                    JSON.stringify(
                        state,
                        null,
                        2
                    )
                ],
                {
                    type:
                        "application/json"
                }
            );

        const a =
            document.createElement(
                "a"
            );

        a.href =
            URL.createObjectURL(
                blob
            );

        a.download =
            "mein-budget-backup.json";

        a.click();

        setTimeout(
            () =>
                URL.revokeObjectURL(
                    a.href
                ),
            1000
        );
    };
}


/* =========================
   IMPORT
   ========================= */

if ($("importInput")) {

    $("importInput").onchange =
        async e => {

            const file =
                e.target.files[0];

            if (!file) {
                return;
            }

            try {

                const imported =
                    JSON.parse(
                        await file.text()
                    );

                if (
                    !imported.budgets ||
                    !Array.isArray(
                        imported.expenses
                    )
                ) {
                    throw new Error();
                }

                state =
                    imported;

                if (save()) {

                    render();

                    alert(
                        "Daten importiert."
                    );
                }

            } catch {

                alert(
                    "Die Datei konnte nicht importiert werden."
                );
            }

            e.target.value =
                "";
        };
}


/* =========================
   START
   ========================= */

render();


/* =========================
   SERVICE WORKER
   ========================= */

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register(
                    "service-worker.js?v=3"
                )
                .catch(
                    () => {}
                );

        }
    );
}