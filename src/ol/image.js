goog.provide('ol.Image');

goog.require('ol');
goog.require('ol.ImageBase');
goog.require('ol.ImageState');
goog.require('ol.events');
goog.require('ol.events.EventType');
goog.require('ol.extent');


/**
 * @constructor
 * @extends {ol.ImageBase}
 * @param {ol.Extent} extent Extent.
 * @param {number|undefined} resolution Resolution.
 * @param {number} pixelRatio Pixel ratio.
 * @param {string} src Image source URI.
 * @param {?string} crossOrigin Cross origin.
 * @param {ol.ImageLoadFunctionType} imageLoadFunction Image load function.
 */
ol.Image = function(extent, resolution, pixelRatio, src, crossOrigin, imageLoadFunction) {

  ol.ImageBase.call(this, extent, resolution, pixelRatio, ol.ImageState.IDLE);

  /**
   * @private
   * @type {string}
   */
  this.src_ = src;

  /**
   * @private
   * @type {HTMLCanvasElement|Image|HTMLVideoElement}
   */
  this.image_ = new Image();
  if (crossOrigin !== null) {
    this.image_.crossOrigin = crossOrigin;
  }

  /**
   * @private
   * @type {Array.<ol.EventsKey>}
   */
  this.imageListenerKeys_ = null;

  /**
   * @protected
   * @type {ol.ImageState}
   */
  this.state = ol.ImageState.IDLE;

  /**
   * @private
   * @type {ol.ImageLoadFunctionType}
   */
  this.imageLoadFunction_ = imageLoadFunction;

};
ol.inherits(ol.Image, ol.ImageBase);


/**
 * @inheritDoc
 * @api
 */
ol.Image.prototype.getImage = function() {
  return this.image_;
};


/**
 * Tracks loading or read errors.
 *
 * @private
 */
ol.Image.prototype.handleImageError_ = function() {
  this.state = ol.ImageState.ERROR;
  this.unlistenImage_();
  this.changed();
};


/**
 * Tracks successful image load.
 *
 * @private
 */
ol.Image.prototype.handleImageLoad_ = function() {
  if (this.resolution === undefined) {
    this.resolution = ol.extent.getHeight(this.extent) / this.image_.height;
  }
  this.state = ol.ImageState.LOADED;
  this.unlistenImage_();
  this.changed();
};


/**
 * Load the image or retry if loading previously failed.
 * Loading is taken care of by the tile queue, and calling this method is
 * only needed for preloading or for reloading in case of an error.
 * @override
 * @api
 */
ol.Image.prototype.load = function() {
  if (this.state == ol.ImageState.IDLE || this.state == ol.ImageState.ERROR) {
    this.state = ol.ImageState.LOADING;
    this.changed();
    this.imageListenerKeys_ = [
      ol.events.listenOnce(this.image_, ol.events.EventType.ERROR,
          this.handleImageError_, this),
      ol.events.listenOnce(this.image_, ol.events.EventType.LOAD,
          this.handleImageLoad_, this)
    ];
    this.imageLoadFunction_(this, this.src_);
  }
};


/**
 * @param {HTMLCanvasElement|Image|HTMLVideoElement} image Image.
 */
ol.Image.prototype.setImage = function(image) {
  this.image_ = image;
};


/**
 * Discards event handlers which listen for load completion or errors.
 *
 * @private
 */
ol.Image.prototype.unlistenImage_ = function() {
  this.imageListenerKeys_.forEach(ol.events.unlistenByKey);
  this.imageListenerKeys_ = null;
};

/**
 * @inheritDoc
 */
ol.Image.prototype.disposeInternal = function() {
  if (this.image_) {
    // It seems that Safari/UIWebView does not GC canvases very actively:
    // https://github.com/openlayers/openlayers/issues/8956
    // https://stackoverflow.com/questions/52532614/total-canvas-memory-use-exceeds-the-maximum-limit-safari-12
    //
    // And on iOS 12 / Safari 12 canvas memory has been halved:
    // https://github.com/WebKit/webkit/commit/5d5b478917c685e50d1032ccf761ca53fc8f1b74#diff-b411cd4839e4bbc17b00570536abfa8f
    //
    // Setting canvas width and height to zero before rendering a new canvas works
    // at least on iOS 12.1.1 Safari browser, when testing things like:
    // https://stackoverflow.com/a/53005607/1667913
    //
    // So this has been added here in the hopes that it will help,
    // even though the issue has not been reliably reproduced in a
    // iOS 12 + Cordova + OpenLayers 4.6.5 environment.

    // First resetting styles, because supposedly having CSS width/height set
    // will cause width/height canvas element attributes to not do anything:
    // https://stackoverflow.com/a/8349409/1667913
    this.image_.removeAttribute('style');

    // Then changing the element attributes:
    this.image_.width = this.image_.height = 0;
  }

  ol.ImageBase.prototype.disposeInternal.call(this);
};
