var expect = require('chai').expect;
var rl = require('../index');

describe('EndNote XML output', function() {
	var refs = [
		{title: 'Hello World', authors: ['Joe Random', 'John Random'], volume: 1},
		{title: 'Goodbye World', authors: ['Josh Random', 'Janet Random'], volume: 2},
	];

	var output;

	before(function(next) {
		output = '';
		rl.output(refs)
			.on('data', function(data) {
				output += data;
			})
			.on('end', function() {
				next();
			});
	});

	it('should return content', function() {
		expect(output).to.be.ok;
		console.log('GOT', output);
	});
});
