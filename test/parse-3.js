var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('EndNote XML parser - test #3 (big data set)', function() {
	var resErr;
	var resCountCalled = 0;
	var sampleData = {};

	before(function(next) {
		this.timeout(60 * 1000);
		rl.parse(fs.createReadStream(__dirname + '/data/endnote-lg.xml'))
			.on('error', function(err) {
				resErr = err;
				next();
			})
			.on('ref', function(ref) {
				resCountCalled++;
				if (ref.isbn == '0971-4502') {
					sampleData['darbepoetin'] = ref;
				} else if (ref.isbn == '0248-8663') {
					sampleData['diuretics-cardiovascular'] = ref;
				} else if (ref.isbn == '0039-2499') {
					sampleData['blood-pressure'] = ref;
				}
			})
			.on('end', next);
	});

	it('should not raise an error', function() {
		expect(resErr).to.be.not.ok;
	});

	it('end count should be accurate', function() {
		expect(resCountCalled).to.equal(3820);
	});

	it('should return random sample (blood-pressure)', function() {
		var sample = sampleData['blood-pressure'];
		expect(sample).to.be.ok;
		expect(sample).to.have.property('title', 'Blood pressure variability and risk of new-onset atrial fibrillation: A systematic review of randomized trials of antihypertensive drugs');
		expect(sample).to.have.property('journal', 'Stroke');
		expect(sample).to.have.property('authors');
		expect(sample.authors).to.have.length(2);
		expect(sample.authors[0]).to.equal('Webb, A. J. S.');
		expect(sample.authors[1]).to.equal('Rothwell, P. M.');
		expect(sample).to.have.property('address', 'P. M. Rothwell, Stroke Prevention Research Unit, Department of Clinical Neurology, John Radcliffe Hospital, Oxford OX39DU, United Kingdom');
		expect(sample).to.have.property('pages', '2091-2093');
		expect(sample).to.have.property('volume', '41');
		expect(sample).to.have.property('number', '9');
		expect(sample).to.have.property('year', '2010');
		expect(sample).to.have.property('abstract');
		expect(sample.abstract).to.match(/^Background and Purpose/);
		expect(sample.abstract).to.match(/American Heart Association, Inc\.$/);
		expect(sample).to.have.property('isbn', '0039-2499');
		expect(sample).to.have.property('urls');
		expect(sample.urls).to.have.length(2);
		expect(sample.urls[0]).to.equal('http://www.embase.com/search/results?subaction=viewrecord&from=export&id=L51007603');
		expect(sample.urls[1]).to.equal('http://dx.doi.org/10.1161/STROKEAHA.110.589531');
		expect(sample.tags).to.have.length(22);
		expect(sample.tags).to.include('angiotensin receptor antagonist');
		expect(sample.tags).to.include('blood pressure variability');
		expect(sample.tags).to.include('heart atrium fibrillation');
		expect(sample.tags).to.include('new onset atrial fibrillation');
		expect(sample.tags).to.include('systolic blood pressure');
	});


	it('should return random sample (darbepoetin)', function() {
		var sample = sampleData['darbepoetin'];
		expect(sample).to.be.ok;
		expect(sample).to.have.property('title', 'Darbepoetin in cancer related anemia');
		expect(sample).to.have.property('journal', 'Indian Journal of Hematology and Blood Transfusion');
		expect(sample).to.have.property('authors');
		expect(sample.authors).to.have.length(1);
		expect(sample.authors).to.deep.equal(['Shah, B.']);
		expect(sample).to.have.property('address', 'B. Shah, Hemato Oncology Clinic, Vedanta Institute of Medical Science, Ahmedabad, India');
		expect(sample).to.have.property('pages', '270-271');
		expect(sample).to.have.property('volume', '29');
		expect(sample).to.have.property('number', '4');
		expect(sample).to.have.property('year', '2013');
		expect(sample).to.have.property('abstract');
		expect(sample.abstract).to.match(/^Anemia is prevalent/);
		expect(sample).to.have.property('isbn', "0971-4502");
		expect(sample).to.have.property('urls');
		expect(sample.urls).to.have.length(2);
		expect(sample.urls).to.deep.equal(['http://www.embase.com/search/results?subaction=viewrecord&from=export&id=L71223494', 'http://dx.doi.org/10.1007/s12288-013-0303-y'], 'urls');
		expect(sample.tags).to.have.length(86);
		expect(sample.tags).to.include('novel erythropoiesis stimulating protein');
		expect(sample.tags).to.include('steroid');
		expect(sample.tags).to.include('anemia');
		expect(sample.tags).to.include('chemotherapy');
		expect(sample.tags).to.include('myelodysplastic syndrome');
	});


	it('should return random sample (diuretics-cardiovascular)', function() {
		var sample = sampleData['diuretics-cardiovascular'];
		expect(sample).to.be.ok;
		expect(sample).to.have.property('title', 'Diuretics and cardiovascular outcome in hypertensive patients: An update');
		expect(sample).to.have.property('journal', 'Revue de Medecine Interne');
		expect(sample).to.have.property('authors');
		expect(sample.authors).to.have.length(2);
		expect(sample.authors).to.deep.equal(['Plouin, P. F.','Bobrie, G.']);
		expect(sample).to.have.property('address', 'P.-F. Plouin, Unite d\'Hypertension Arterielle, Hopital Europeen Georges-Pompidou, 75908 Paris Cedex 15, France');
		expect(sample).to.have.property('pages', '495-497');
		expect(sample).to.have.property('volume', '24');
		expect(sample).to.have.property('number', '8');
		expect(sample).to.have.property('year', '2003');
		expect(sample).to.not.have.property('abstract');
		expect(sample).to.have.property('urls');
		expect(sample.urls).to.have.length(2);
		expect(sample.urls).to.deep.equal(['http://www.embase.com/search/results?subaction=viewrecord&from=export&id=L36928859', 'http://dx.doi.org/10.1016/S0248-8663(03)00135-8'], 'urls');
		expect(sample.tags).to.have.length(23);
		expect(sample.tags).to.include('alpha adrenergic receptor blocking agent');
		expect(sample.tags).to.include('doxazosin');
		expect(sample.tags).to.include('methyldopa');
		expect(sample.tags).to.include('clinical trial');
		expect(sample.tags).to.include('hypertension');
	});
});
