import Ember from 'ember';

var PhotoCollection = Ember.ArrayProxy.extend(Ember.SortableMixin, {
	sortProperties: ['dates.taken'],
	sortAscending: false,
	content: [],
});

export default Ember.Controller.extend({
	photos: PhotoCollection.create(),
	searchField: '',
	tagSearchField: '',
	appKey: 'c731f4d8be2e6fd3efa41452ae8c3d57',
	appSecret: 'f3d901bda87e4c5c',
	filteredPhotosLoaded: function() { 
		return this.get('filteredPhotos').length > 0; 
	}.property('filteredPhotos.length'),
	tagList: ['hi','cheese'],
	filteredPhotos: function () {
		var filter = this.get('searchField');
		var rx = new RegExp(filter, 'gi');
		var photos = this.get('photos');

		return photos.filter(function(photo){
			return photo.get('title').match(rx) || photo.get('owner.username').match(rx);
		});
	}.property('photos.@each','searchField'),
	actions: {
		search: function () {
			this.set('loading', true);
			this.get('photos').content.clear();
			this.store.unloadAll('photo');
			this.send('getPhotos',this.get('tagSearchField'));
			console.log("Connected to search function");
		},
		getPhotos: function(tag){
			var apiKey = this.get('appKey');
			var host = 'https://api.flickr.com/services/rest/';
			var method = "flickr.photos.search";
			var requestURL = host + "?method="+method + "&api_key="+apiKey+"&tags="+tag+"&per_page=50&format=json&nojsoncallback=1";
			var photos = this.get('photos');
			var t = this;
			Ember.$.getJSON(requestURL, function(data){
				//callback for successfully completed requests
				//make secondary requests to get all of the photo information
				data.photos.photo.map(function(photoitem) {//iterate over each photo
					var infoRequestURL = host + "?method="+"flickr.photos.getInfo" + "&api_key="+apiKey+ "&photo_id="+photoitem.id+"&format=json&nojsoncallback=1";
					Ember.$.getJSON(infoRequestURL, function(item){
						var photo = item.photo;
						var tags = photo.tags.tag.map(function(tagitem){
							return tagitem._content;
						});
						var newPhotoItem = t.store.createRecord('photo',{
							title: photo.title._content,
							dates: photo.dates,
							owner: photo.owner,
							description: photo.description._content,
							link: photo.urls.url[0]._content,
							views: photo.views,
							tags: tags,
							//flickr url data
							id: photo.id,
							farm: photo.farm,
							secret: photo.secret,
							server: photo.server,
						});
						photos.pushObject(newPhotoItem);
					});
				});
			});
		},
		login: function () {
			var apiKey = this.get('appKey');
			var appSecret = this.get('appSecret');
			var timestamp = new Date().getTime().toString();
			var nonce = Math.floor(Math.random()*0x1327823AABCDE12).toString(16);
			var host = 'https://www.flickr.com/services/oauth/request_token';
			var callback = encodeURIComponent("https://infinite-brook-2297.herokuapp.com/");

			var requestURL = "oauth_callback="+callback+"&oauth_consumer_key="+apiKey+"&oauth_nonce="+nonce+"&oauth_signature_method=HMAC-SHA1"+"&oauth_timestamp="+timestamp+"&oauth_version=1.0";

			var baseString = "GET&"+encodeURIComponent(host)+"&"+encodeURIComponent(requestURL).replace(/\+/g, '%20');

			var key = appSecret + "&";

			var signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA1(baseString, key));

			var tokenURL = host+"?"+"oauth_callback="+callback+"&oauth_consumer_key="+apiKey+"&oauth_nonce="+nonce+"&oauth_signature_method=HMAC-SHA1"+"&oauth_timestamp="+timestamp+"&oauth_version=1.0"+"&oauth_signature="+encodeURIComponent(signature);

			console.log("This is you url you would use to request an oauth 1.0a flickr request token:", tokenURL);
			console.log("Unfortunately the flickr API does not return json data and I have not found a good workaround to make a cross domain text only ajax call.");
		},
		clicktag: function(tag){
			this.set('tagSearchField', tag);
			this.set('loading', true);
			this.get('photos').content.clear();
			this.store.unloadAll('photo');
			this.send('getPhotos',tag);
		}
	},
	init: function(){
		this._super.apply(this, arguments);
		var apiKey = this.get('appKey');
		var host = 'https://api.flickr.com/services/rest/';
		var method = "flickr.tags.getHotList";
		var requestURL = host + "?method="+method + "&api_key="+apiKey+"&count=75&format=json&nojsoncallback=1";
		var t = this;
		Ember.$.getJSON(requestURL, function(data){
			//callback for successfully completed requests
			console.log(data);
			data.hottags.tag.map(function(tag) {
				t.get('tagList').pushObject(tag._content);
			});
		});
	}
});