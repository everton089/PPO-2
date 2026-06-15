const progressCtx =
document.getElementById(
"progressChart"
);

new Chart(progressCtx, {

    type: "line",

    data: {

        labels: [
            "Sim 1",
            "Sim 2",
            "Sim 3",
            "Sim 4",
            "Sim 5",
            "Sim 6"
        ],

        datasets: [

            {
                label: "Média",

                data: [
                    52,
                    58,
                    61,
                    67,
                    73,
                    78
                ],

                tension: .4,

                borderWidth: 3
            }

        ]

    }

});

const subjectCtx =
document.getElementById(
"subjectChart"
);

new Chart(subjectCtx, {

    type: "bar",

    data: {

        labels: [
            "Mat",
            "Port",
            "Hist",
            "Geo",
            "Ciências"
        ],

        datasets: [

            {
                data: [
                    82,
                    76,
                    68,
                    71,
                    79
                ]
            }

        ]

    }

});

const pieCtx =
document.getElementById(
"pieChart"
);

new Chart(pieCtx, {

    type: "pie",

    data: {

        labels: [
            "Matemática",
            "Português",
            "História",
            "Geografia"
        ],

        datasets: [

            {
                data: [
                    31,
                    28,
                    20,
                    21
                ]
            }

        ]

    }

});
console.log("sauhf");
