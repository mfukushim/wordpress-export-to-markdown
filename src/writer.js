const fs = require('fs');
const luxon = require('luxon');
const path = require('path');
const request = require('request');

const shared = require('./shared');

function writeFiles(posts, config) {
    let delay = 0;
	posts.forEach(post => {
		const postDir = getPostDir(post, config);
		createDir(postDir);
		writeMarkdownFile(post, postDir, config);

        post.meta.imageUrls.forEach(imageUrl => {
            const imageDir = path.join(postDir, 'images');
            createDir(imageDir);
            writeImageFile(imageUrl, imageDir, delay);
            delay += 25;
        });
	});
}

function writeMarkdownFile(post, postDir, config) {
	const frontmatter = Object.entries(post.frontmatter)
		.reduce((accumulator, pair) => {
			return accumulator + pair[0] + ': "' + pair[1] + '"\n'
		}, '');
	const data = '---\n' + frontmatter + '---\n\n' + post.content + '\n';
	
	const postPath = path.join(postDir, getPostFilename(post, config));
	fs.writeFile(postPath, data, (err) => {
		if (err) {
			console.log('Unable to write file.')
			console.log(err);
		} else {
			console.log('Wrote ' + postPath + '.');
		}
	});
}

function writeImageFile(imageUrl, imageDir, delay) {
	let imagePath = path.join(imageDir, shared.getFilenameFromUrl(imageUrl));
	let stream = fs.createWriteStream(imagePath);
	stream.on('finish', () => {
		console.log('Saved ' + imagePath + '.');
	});

	// stagger image requests so we don't piss off hosts
	setTimeout(() => {
		request
			.get(imageUrl)
			.on('response', response => {
				if (response.statusCode !== 200) {
					console.log('Response status code ' + response.statusCode + ' received for ' + imageUrl + '.');
				}
			})
			.on('error', err => {
				console.log('Unable to download image.');
				console.log(err);
			})
			.pipe(stream);
	}, delay);
}

function createDir(dir) {
	try {
		fs.accessSync(dir, fs.constants.F_OK);
	} catch (ex) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

function getPostDir(post, config) {
	let dir = config.output;
	let dt = luxon.DateTime.fromISO(post.frontmatter.date);

	if (config.yearmonthfolders) {
		dir = path.join(dir, dt.toFormat('yyyy'), dt.toFormat('LL'));
	} else if (config.yearfolders) {
		dir = path.join(dir, dt.toFormat('yyyy'));
	}

	if (config.postfolders) {
		let folder = post.meta.slug;
		if (config.prefixdate) {
			folder = dt.toFormat('yyyy-LL-dd') + '-' + folder;
		}
		dir = path.join(dir, folder);
	}

	return dir;
}

function getPostFilename(post, config) {
	if (config.postfolders) {
		// the containing folder name will be unique, just use index.md here
		return 'index.md';
	} else {
		let filename = post.meta.slug + '.md';
		if (config.prefixdate) {
			let dt = luxon.DateTime.fromISO(post.frontmatter.date);
			filename = dt.toFormat('yyyy-LL-dd') + '-' + filename;
		}
		return filename;
	}
}

exports.writeFiles = writeFiles;
