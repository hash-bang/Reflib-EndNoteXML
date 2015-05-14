var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('EndNote XML parser - bad XML', function() {
	var resErr;
	before(function(next) {
		rl.parse('blah blah blah')
			.on('error', function(err) {
				resErr = err;
				next();
			})
			.on('end', function(count) {
				next();
			});
	});

	it('Should return an error', function() {
		expect(resErr).to.be.ok;
	});
});


describe('EndNote XML parser', function() {
	var resErr, resCount = 0, resCountCalled = 0;
	var sampleData = {};

	before(function(next) {
		this.timeout(60 * 1000);
		rl.parse(fs.readFileSync(__dirname + '/data/endnote.xml'))
			.on('error', function(err) {
				resErr = err;
				next();
			})
			.on('ref', function(ref) {
				resCountCalled++;
				if (ref.isbn == '1097-685X' && ref.title == 'A method for chest drainage after pediatric cardiac surgery: a prospective randomized trial') {
					sampleData['pediatric-cardiac'] = ref;
				}
			})
			.on('end', function(count) {
				resCount = count;
				next();
			});
	});

	it('should not raise an error', function() {
		expect(resErr).to.be.not.ok;
	});

	it('end count should be accurate', function() {
		expect(resCount).to.not.equal(0);
		expect(resCountCalled).to.not.equal(0);
		expect(resCount).to.equal(resCountCalled);
	});

	it('should return random sample (pediatric-cardiac)', function() {
		var sample = sampleData['pediatric-cardiac'];
		expect(sample).to.be.ok;
		expect(sample).to.have.property('title', 'A method for chest drainage after pediatric cardiac surgery: a prospective randomized trial');
		expect(sample).to.have.property('titleSecondary', 'Journal of Thoracic & Cardiovascular Surgery');
		expect(sample).to.have.property('authors');
		expect(sample.authors).to.have.length(1);
		expect(sample.authors[0]).to.equal('Agati, Salvatore; Mignosa, Carmelo; Gitto, Placido; Trimarchi, Eugenio Santo; Ciccarello, Giuseppe; Salvo, Dario; Trimarchi, Giuseppe');
		expect(sample).to.have.property('address', 'Pediatric Cardiac Surgery Unit, San Vincenzo Hospital, Taormina, Messina, Italy. sasha.agati@tiscali.it');
		expect(sample).to.have.property('pages', '1306-9');
		expect(sample).to.have.property('volume', '131');
		expect(sample).to.have.property('number', '6');
		expect(sample).to.have.property('date', 'Jun 2006');
		expect(sample).to.have.property('abstract');
		expect(sample.abstract).to.match(/^OBJECTIVES: .*removal\.$/);
		expect(sample).to.have.property('label', 'OK');
		expect(sample).to.have.property('caption', '970');
		expect(sample).to.have.property('notes', 'EM');
		expect(sample).to.have.property('isbn', '1097-685X');
		expect(sample).to.have.property('urls');
		expect(sample.urls).to.have.length(1);
		expect(sample.urls[0]).to.equal('http://ovidsp.ovid.com/ovidweb.cgi?T=JS&CSC=Y&NEWS=N&PAGE=fulltext&D=med4&AN=16733162; http://ZL9EQ5LQ7V.search.serialssolutions.com/?sid=OVID:medline&id=pmid:16733162&id=doi:&issn=0022-5223&isbn=&volume=131&issue=6&spage=1306&pages=1306-9&date=2006&title=Journal+of+Thoracic+%26+Cardiovascular+Surgery&atitle=A+method+for+chest+drainage+after+pediatric+cardiac+surgery%3A+a+prospective+randomized+trial.&aulast=Agati&pid=%3Cauthor%3EAgati+S%3BMignosa+C%3BGitto+P%3BTrimarchi+ES%3BCiccarello+G%3BSalvo+D%3BTrimarchi+G%3C%2Fauthor%3E%3CAN%3E16733162%3C%2FAN%3E%3CDT%3EJournal+Article%3C%2FDT%3E');
		expect(sample).to.have.property('researchNotes', 'Agati S; Mignosa C; Gitto P; Trimarchi ES; Ciccarello G; Salvo D; Trimarchi G');
	});
});
