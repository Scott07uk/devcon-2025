
var inputObject = [
    {
      "juvenile": false,
      "dryRequired": false,
      "gender": "MALE",
      "homeLocation": [463750, 128350], //Ropley
      "seperateSuites": true,
    },
    {
      "juvenile": false,
      "dryRequired": false,
      "gender": "MALE",
      "homeLocation": [463050, 150000],  //basingstoke
      "seperateSuites": false,
    },
    {
      "juvenile": false,
      "dryRequired": false,
      "gender": "MALE",
      "homeLocation": [435750, 144750], //andover
      "seperateSuites": false,
    }
  ];

class Rand {
  constructor() {
    this.lookupTable = [];
    this.index = 0;
    for (var i=1e6; i > 0; i--) {
      this.lookupTable.push(Math.random());
    }
  }
  next() {
    this.index++;
    if (this.index >= this.lookupTable.length) {
      this.index = 0;
    }
    return this.lookupTable[this.index];
  }
}

class GeneticAlg {
  constructor(geneSize, populationFunction, fitnessFunction, randomNumbers) {
    this.geneSize = geneSize;
    this.populationFunction = populationFunction;
    this.fitnessFunction = fitnessFunction;
    this.populationSize = 30;
    this.population = [this.populationSize];
    this.populationFitness = [this.populationSize];
    this.fittestIndividual = 0;
    this.mutateChance = 0.05;
    this.random = randomNumbers;
    for (var index = 0; index < this.populationSize; index++) {
      var individual = [this.geneSize]
      for (var geneIndex = 0; geneIndex < this.geneSize; geneIndex++) {
        individual[geneIndex] = populationFunction();
      }
      this.population[index] = individual;
    }
    this.scorePopulation();
  }

  scorePopulation() {
    var lowestScore = 10000000000;
    var bestIndividual = 0;
    var newScores = [this.population.length];
    for (var i = 0; i < this.population.length; i++) {
      var score = this.fitnessFunction(this.population[i]);
      if (isNaN(score)) {
        console.log(this.population[i]);
        breakOnScoreBeingNaN();
      }
      newScores[i] = score;
      if (lowestScore > score) {
        lowestScore = score;
        bestIndividual = i;
      }
    }

    this.populationFitness = newScores;
    this.fittestIndividual = bestIndividual;
  }

  loopGeneration(count) {
    for (var i = 0; i < count; i++) {
      console.log('running generation: ' + i);
      this.runGeneration();
    }
  }

  runGeneration() {
    var newPopulation = [];
    //we keep the fittest
    newPopulation.push(this.population[this.fittestIndividual]);
    var maxScore = Math.max(...this.populationFitness);
    var probabilities = [this.populationFitness.length];
    var sumOfProbs = 0;
    for (var i = 0; i < this.populationFitness.length; i++) {
      var prob = (maxScore / this.populationFitness[i]);
      probabilities[i] = prob;
      sumOfProbs += prob;
    }

    while (newPopulation.length < this.populationSize) {
      var parent1 = this.selectIndividual(probabilities, sumOfProbs);
      var parent2 = this.selectIndividual(probabilities, sumOfProbs);
      var split = Math.floor(this.random.next() * parent1.length);
      var descendant1 = [parent1.length];
      var descendant2 = [parent1.length];
      for (var i = 0; i < parent1.length; i++) {
        if (i < split) {
          descendant1[i] = parent1[i];
          descendant2[i] = parent2[i];
        } else {
          descendant1[i] = parent2[i];
          descendant2[i] = parent1[i];
        }
      }
      newPopulation.push(descendant1);
      newPopulation.push(descendant2);
    }

    for (var i=1; i < newPopulation.length; i++) {
      var individual = newPopulation[i];
      for (var j = 0; j < individual.length; j++) {
        if (Math.random() < this.mutateChance) {
          individual[j] = this.populationFunction();
        }
      }
    }

    this.population = newPopulation;

    newPopulation = null;
    probabilities = null;

    this.scorePopulation();
  }

  // selects an individual from the population based on the probabilies, this means some (ie fitter)individuals have a bigger chance of being selected than others.
  selectIndividual(probabilities, sumOfProbs) {
    var locator = this.random.next() * sumOfProbs;
    for (var i = 0; probabilities.length; i++) {
      if (locator < probabilities[i]) {
        return this.population[i];
      }
      locator = locator - probabilities[i];
    }
    return this.population(this.population.length);
  }


}

function defaultPopulationFunction() {
  var resp = Math.floor(randomNumbers.next() * cells.length);
  return resp;
}

function defaultFitnessFunction(individual) {
  var fitness = 0;
  for (var i = 0; i < individual.length; i++) {
    fitness += individual[i] * 2;
  }

  var indvSet = new Set(individual);
  if (indvSet.length != individual.length) {
    //same sell is allocated twice, massive score
    fitness += SCORE_DUPLICATE_CELL_ALLOCATION;
  }
  suiteList = new Set();
  for (var gene = 0; gene < individual.length; gene++) {
    var detainee = inputObject[gene];
    var value = individual[gene];
    var cell = cells[value];

    suiteList.add(cell.suite);

    if (detainee.dryRequired && !cell.dry) {
      // the detanee needa a dry cell, but we have not allocated one
      fitness += SCORE_DRY_REQUIRED_BUT_NOT_DELIVERED;
    }
    if (detainee.juvenile && !cell.dry) {
      //better to put juveniles in dry cells
      fitness += SCORE_DRY_JUVENILE_PREFERED_BUT_NOT_DELIVERED;
    }
    if (detainee.gender != cell.type) {
      //we have not allocated the correct gender of cell
      fitness += SCORE_INCORRECT_GENDER_ALLOCATION;
    }

    var distanceToCell = calculateDistanceToCell(detainee, cell) / 1000;
    fitness += distanceToCell;

    if (detainee.seperateSuites) {
      for (var gene2 = 0; gene2 < individual.length; gene2++) {
        if (gene2 != gene) {
          var detainee2 = inputObject[gene2];
          var value2 = individual[gene2];
          var cell2 = cells[value2];

          if (cell2.suite == cell.suite) {
            // a detainee needs to go to a sepetate suite, but we have given them same one
            fitness += SCORE_SEPARATED_DETAINEES_SAME_SUITE;
            break;
          }
        }
      }
    }
  }
  //we want to reduce the number of suites in use where possible
  fitness += suiteList.size * 100;

  return fitness + 1;
}

// Simple euclidian distance calculation
function calculateDistanceToCell(detainee, cell) {
  var xspace = detainee.homeLocation[0] - cell.location[0];
  var yspace = detainee.homeLocation[1] - cell.location[1];
  xspace = xspace * xspace;
  yspace = yspace * yspace;

  return Math.sqrt(xspace + yspace);
}

function doIt() {
  var genAlg = new GeneticAlg(inputObject.length, defaultPopulationFunction, defaultFitnessFunction, randomNumbers);
  genAlg.loopGeneration(25);
  var fittest = genAlg.population[genAlg.fittestIndividual];

  var html = '<table border=1><tr><th>Index</th><th>Dry Cell Required?</th><th>Juvenile</th><th>Seperate Suites</th><th>Detainee Gender</th><th>Cell</th><th>Dry</th><th>Cell Gender</th></tr>';

  for (var i = 0; i < fittest.length; i++) {
    var detainee = inputObject[i];
    var value = fittest[i];
    var cell = cells[value];
    html = html + '<tr><td>' + i + '</td><td>' + detainee.dryRequired + '</td><td>' + detainee.juvenile + '</td><td>' + detainee.seperateSuites + '</td><td>' + detainee.gender + '</td>';
    html = html + '<td>' + cell.room + '</td><td>' + cell.dry + '</td><td>' + cell.type + '</td>';
    html = html + '</tr>';
  }
    
  html = html + '</table>';

  document.getElementById('result').innerHTML = html;
  genAlg = null;
}

var randomNumbers = new Rand();

const SCORE_DUPLICATE_CELL_ALLOCATION =       100000;
const SCORE_DRY_REQUIRED_BUT_NOT_DELIVERED =  100000;
const SCORE_DRY_JUVENILE_PREFERED_BUT_NOT_DELIVERED = 100;
const SCORE_CELL_VACANCY_PENALTY =              1000;
const SCORE_SEPARATED_DETAINEES_SAME_SUITE =    1000;
const SCORE_INCORRECT_GENDER_ALLOCATION =          5;
