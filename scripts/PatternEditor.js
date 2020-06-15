//(c) Copyright 2019-20 Jason Dore
//
//Inspired by the excellent Seamly2D/Valentina pattern drawing software.
//This library is a ground up implementation in Javascript intended to be compatible with, but
//not based on, the Seamly2D/Valentina pattern making systen in order to support the community
//pattern sharing website https://my-pattern.cloud/ . 
//
//Source maintained at: https://github.com/MrDoo71/PatternEditor

var selectedObject;
var linksGroup;
var fontsSizedForScale = 1;
var fontResizeTimer;
var updateServerTimer;
var timeOfLastTweak;
var doDrawingAndTable;

function drawPattern( dataAndConfig, ptarget, graphOptions ) 
{
    //Remove the svg if called by graph_kill
    if ( dataAndConfig === null )
    {
        var parent = document.getElementById(ptarget).parentNode;
        var child = document.getElementById(ptarget);
        parent.removeChild(child);
        return ;
    } 

    //This is a graph initialisation

    var pattern = new Pattern( dataAndConfig, graphOptions );            
    
    // show menu on right-click.
    var contextMenu = typeof goGraph === "function" ? function(d) {
   		d3.event.preventDefault() ;
    	var v = newkvpSet(false) ;
    	v.add("x", d.x) ;   
    	v.add("y", d.y) ;    
    	goGraph( graphOptions.interactionPrefix + ':' + d.data.contextMenu ,
    			 d3.event, 
    			 v ) ;
    } : function(d){};     
    
    var targetdiv = d3.select( "#" + ptarget )
                       .append( "div" )
                       .attr( "class", "pattern-editor" );

    if ( ! dataAndConfig.options )
        dataAndConfig.options = {};

    var options = dataAndConfig.options;

    if ( options.allowPanAndZoom === undefined )
        options.allowPanAndZoom = true;

    if ( options.showFormulas === undefined )
        options.showFormulas = true;

    if ( options.drawingTableSplit === undefined )
        options.drawingTableSplit = 0.66;

    if ( options.lastMixedSplit === undefined )
        options.lastMixedSplit = options.drawingTableSplit > 0.0 && options.drawingTableSplit < 1.0 ? options.drawingTableSplit : 0.66;

    if ( ! options.viewOption )
        options.viewOption = [  { "mode":"drawing", "icon": "icon-picture",       "drawingTableSplit": 1.0 },
                                { "mode":"mixed",   "icon": "icon-columns",       "drawingTableSplit": 0.5 },
                                { "mode":"table",   "icon": "icon-align-justify", "drawingTableSplit": 0 } ];

    options.interactionPrefix = graphOptions.interactionPrefix;

    options.layoutConfig = { drawingWidth: 400,
                             drawingHeight: 600,
                             drawingMargin: 0,
                             tableWidth: 400,
                             tableHeight: 600,
                             tableMargin: 0 };

    if ( ! options.translateX )                                           
        options.translateX = 0;

    if ( ! options.translateY )                                           
        options.translateY = 0;

    if ( ! options.scale )                                           
        options.scale = 1;

    options.setDrawingTableSplit = function( drawingTableSplit ) { //can be called with a decimal (0.0 - 1.0), a mode ("drawing","mixed","table"), or nothing.

        //TODO if going full-screen and not specifying a split here, then keep the table the same width and give all extra space to the drawing
        
        if ( drawingTableSplit === undefined )
            drawingTableSplit = this.drawingTableSplit;
        else if ( drawingTableSplit === "drawing" )
            drawingTableSplit = 1.0;
        else if ( drawingTableSplit === "mixed" )
            drawingTableSplit = this.lastMixedSplit ? this.lastMixedSplit : 0.5;
        else if ( drawingTableSplit === "table" )
            drawingTableSplit = 0.0;

        if ( drawingTableSplit < 0.05 ) 
        {
            drawingTableSplit = 0.0;
            this.drawingTableSplitMode = "table";
        }
        else if ( drawingTableSplit > 0.95 ) 
        {
            drawingTableSplit = 1.0;
            this.drawingTableSplitMode = "drawing";
        }
        else
        {
            this.drawingTableSplitMode = "mixed";
            this.lastMixedSplit = drawingTableSplit;
        }

        var availableWidth = Math.round( window.innerWidth - 30);//targetdiv.style('width').slice(0, -2) -30 ); //30 for resize bar
        var availableHeight= Math.round( window.innerHeight - targetdiv.node().getBoundingClientRect().top -60/*controlpanel buttons height*/);
        if ( this.fullWindow )
        {
            availableWidth -= 32; //left & right padding 
            availableHeight -= 30;
        }

        //TODO availableHeight remove height of wallpapers descriptions

        //console.log("setDrawingTableSplit availableWidth:" + availableWidth + " fullWindow:" + this.fullWindow + " drawingWidth:" + this.layoutConfig.drawingWidth );
        this.layoutConfig.drawingWidth = availableWidth * drawingTableSplit;
        this.layoutConfig.tableWidth   = availableWidth * (1-drawingTableSplit);
        this.layoutConfig.drawingHeight = availableHeight;
        this.layoutConfig.tableHeight = availableHeight;
        console.log("setDrawingTableSplit split:" + drawingTableSplit + " availableWidth:" + availableWidth + " fullWindow:" + this.fullWindow + " drawingWidth:" + this.layoutConfig.drawingWidth );
        
        if ( this.sizeButtons )
        {
            var drawingTableSplitMode = this.drawingTableSplitMode;
            this.sizeButtons.selectAll("button")
                        .data( this.viewOption )
                        //.enter()
                        //.append("button")
                        .attr( "class",  function(d) { 
                            return d.mode == drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } );
        }

        if ( this.drawingTableSplit != drawingTableSplit )
        {
            this.drawingTableSplit = drawingTableSplit; //so we can call this without a parameter when toggling full size. 
            if ( this.updateServer ) 
                this.updateServer(); 
        }
    };    

    options.updateServer = graphOptions.interactionPrefix ? function( k, x, y ) {
        if ( k )
        {
//TODO shouldn't this be this. rather than options.  ???

            if (    (options.translateX == x)
                 && (options.translateY == y)
                 && (options.scale == k) )
                 return;

            options.translateX = x;
            options.translateY = y;
            options.scale = k;
        }
        console.log("Update server with pan: " + x + "," + y + " & zoom:" + k + " & options");
        var kvpSet = newkvpSet(true) ;
        kvpSet.add('fullWindow', options.fullWindow ) ;
        kvpSet.add('drawingTableSplit', options.drawingTableSplit ) ;
        kvpSet.add('scale', options.scale ) ;
        kvpSet.add('translateX', options.translateX ) ;
        kvpSet.add('translateY', options.translateY ) ;        
        goGraph( options.interactionPrefix + ':' + options.update, fakeEvent(), kvpSet) ;    
    } : undefined;

    if ( options.fullWindow )
        targetdiv.node().classList.add("full-page");

    options.setDrawingTableSplit( options.drawingTableSplit ); //shouln't cause a server update

    var focusDrawingObject = function( d, scrollTable )
    {
        if (    ( d3.event) 
             && ( d3.event.originalTarget )
             && ( d3.event.originalTarget.className === "ps-ref" )
             && ( selectedObject == d )
             )
        {
            selectedObject = d.patternPiece.getObject( d3.event.originalTarget.innerHTML );
            scrollTable = true;
        }
        else if (    ( d3.event) 
                  && ( d3.event.srcElement )
                  && ( d3.event.srcElement.className === "ps-ref" )
                  && ( selectedObject == d )
             )
        {
            selectedObject = d.patternPiece.getObject( d3.event.srcElement.innerHTML );
            scrollTable = true;
        }
        else
        {
            selectedObject = d;
        }

        for( var j=0; j< pattern.patternPieces.length; j++ )
            for( var i=0; i< pattern.patternPieces[j].drawingObjects.length; i++ )
            {
                var a = pattern.patternPieces[j].drawingObjects[i];
                var g = a.drawingSvg;
                if ( g )
                {
                    var strokeWidth = a.getStrokeWidth( false, (selectedObject==a) );
                    g.selectAll( "line" )
                     .attr("stroke-width", strokeWidth );
                    g.selectAll( "path" )
                     .attr("stroke-width", strokeWidth );
                }
                else 
                    console.log("No drawing object for " + a.data.name );
            }        

        var graphdiv = targetdiv;
        //Remove any existing highlighting in the table. 
        $(graphdiv.node()).find( ".j-active" ).removeClass("j-active").removeClass("j-active-2s");
        $(graphdiv.node()).find( ".source" ).removeClass("source");
        $(graphdiv.node()).find( ".target" ).removeClass("target");
        //$(graphdiv.node()).find( ".j-outline.j-outline-active" ).removeClass("j-outline-active");
        //$(this).addClass("j-active"); //highlight the object in the drawing

        //d, the drawing object we clicked on, has a direct reference to its representation in the table
        if ( selectedObject.tableSvg ) //should always be set unless there has been a problem
            selectedObject.tableSvg.node().classList.add("j-active");

        if ( selectedObject.drawingSvg )
            selectedObject.drawingSvg.node().classList.add("j-active");

        if ( selectedObject.outlineSvg )
        {
            selectedObject.outlineSvg.node().classList.add("j-active");
            //the blush will only last 2 seconds anyway, but if we don't do this then a second click whilst it is the active one doesn't repeat the blush
            setTimeout( function(){ selectedObject.outlineSvg.node().classList.add("j-active-2s");}, 2000 );
        }

        //Set the css class of all links to "link" "source link" or "target link" as appropriate.
        linksGroup.selectAll("path.link") //rename .link to .dependency
            .attr("class", function( d ) {                         
                if ( d.source == selectedObject ) 
                {
                    d.target.tableSvg.node().classList.add("source");

                    if ( d.target.outlineSvg ) //if it errored this will be undefined
                        d.target.outlineSvg.node().classList.add("source");

                    //d.target.tableSvg.each( function() { $(this).addClass("source"); } );
                    return "source link";
                }
                if ( d.target == selectedObject ) 
                {
                    d.source.tableSvg.node().classList.add("target");

                    if ( d.source.outlineSvg ) //if it errored this will be undefined
                        d.source.outlineSvg.node().classList.add("target");

                    //d.source.tableSvg.each( function() { $(this).addClass("target"); } );
                    return "target link";
                }
                return "link"; 
            } )
            .each( function( d ) { 
                if (( d.source == selectedObject ) || ( d.target == selectedObject ))
                    d3.select(this).raise();
             } );

        //Scroll the table to ensure that d.tableSvg is in view.    
        if ( scrollTable )
        {
            if ( selectedObject.tableSvg )
            {
                var table = d3.select("div.pattern-table");
                table.transition()
                     .duration(500)
                     .tween("uniquetweenname", scrollTopTween( selectedObject.tableSvg.node().__data__.tableSvgY - ( table.node().getBoundingClientRect().height /2) ));
            }
            else
                console.log( "Cannot scroll table, no tableSvg - " + selectedObject.data.name );
        }
    };

    doControls( targetdiv, options, pattern );

    var drawingAndTableDiv = targetdiv.append("div").attr("class", "pattern-main")

    doDrawingAndTable = function() {
                                    if ( options.layoutConfig.drawingWidth )
                                        doDrawing( drawingAndTableDiv, pattern, options, contextMenu, focusDrawingObject );
                                    else
                                    drawingAndTableDiv.select("svg.pattern-drawing").remove();
                                                                            
                                    if (   ( options.layoutConfig.drawingWidth )
                                        && ( options.layoutConfig.tableWidth ) )
                                        doResizeBar( drawingAndTableDiv, options );    
                                    else
                                    drawingAndTableDiv.select("div.pattern-editor-resize").remove();

                                    if ( options.layoutConfig.tableWidth )
                                        doTable( drawingAndTableDiv, pattern, options, contextMenu, focusDrawingObject );
                                    else
                                    drawingAndTableDiv.select("div.pattern-table").remove();
                                };

    doDrawingAndTable();                   
    
    var errorFound = false;
    for( var j=0; j< pattern.patternPieces.length; j++ )
    {
        for( var i=0; i< pattern.patternPieces[j].drawingObjects.length; i++ )
        {
            var a = pattern.patternPieces[j].drawingObjects[i];
            if ( a.error )
            {
                focusDrawingObject(a, true);
                errorFound = true;
                break;
            }
        }
        if ( errorFound )
            break;
    }

    //if not focussing on an error then see if there is a recently edited item to focus on. 
    if ( ( ! errorFound ) && ( options.focus ) )
    {
        var a = pattern.getObject( options.focus );
        if ( a )
            focusDrawingObject(a, true);
    }

}


function doResizeBar( graphdiv, editorOptions )
{
    var layoutConfig = editorOptions.layoutConfig;
    var drag = d3.drag()
    .on("start", function(r) {
        console.log("dragStart");
        var rg = d3.select(this);        
        r.initialX = d3.event.x;
        r.resizeBarBaseStyle = rg.attr("style");
    })
    .on("drag", function(r) {
        console.log("drag");
        var rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle + " left:" + ( d3.event.x - r.initialX ) + "px;" ); 
    })
    .on("end", function(r){
        console.log("dragEnd: " + d3.event.x + " (" + ( d3.event.x - r.initialX ) + ")" );
        console.log( "layoutConfig:" + layoutConfig ); 
        var rg = d3.select(this);       
        rg.attr("style", r.resizeBarBaseStyle ); 
        var newDrawingWidth = layoutConfig.drawingWidth + ( d3.event.x - r.initialX );
        var newTableWidth  = layoutConfig.tableWidth - ( d3.event.x - r.initialX );
        editorOptions.setDrawingTableSplit( newDrawingWidth / ( newDrawingWidth + newTableWidth) );
        doDrawingAndTable();
    });

    var layoutConfig = editorOptions.layoutConfig;
    var height = layoutConfig.drawingHeight;

    graphdiv.select( "div.pattern-editor-resize" ).remove();
    graphdiv.selectAll( "div.pattern-editor-resize" )
            .data( [ editorOptions ] )
            .enter()
            .append("div")
            .attr("class", "pattern-editor-resize")
            .attr("style", "height:" + height + "px;" )
            .call( drag );
}


function doControls( graphdiv, editorOptions, pattern )
{
    if ( ! editorOptions )
        return;

    var controls = graphdiv.append("div").attr("class", "pattern-editor-controls")

    if (    ( editorOptions.viewOption )
         && ( editorOptions.viewOption.length > 1 ) )
    {
        editorOptions.sizeButtons = controls.append("div").attr("class", "btn-group view-options");
        editorOptions.sizeButtons.selectAll("button")
                    .data( editorOptions.viewOption )
                    .enter()
                    .append("button")
                    .attr( "class",  function(d) { return d.mode == editorOptions.drawingTableSplitMode ? "btn btn-primary" : "btn btn-default" } )
                    .html(function(d) { return '<i class="' + d.icon + '"></i>'; })
                    .on("click", function(d) {
                        d3.event.preventDefault();
                        editorOptions.setDrawingTableSplit( d.mode );
                        doDrawingAndTable();
                        //$(this).parent().find("button").removeClass("btn-primary").addClass("btn-default");
                        //$(this).addClass("btn-primary");
                    } );
                    //TODO set the selected button to button-primary
    }

    if ( editorOptions.includeFullPageOption )
    {
        var toggleFullScreen = function() {
            d3.event.preventDefault();

            if ( graphdiv.classed("full-page") ) 
            {
                graphdiv.node().classList.remove("full-page");
                editorOptions.fullWindow = false;
            }
            else
            {
                graphdiv.node().classList.add("full-page");
                editorOptions.fullWindow = true;
            }

            editorOptions.setDrawingTableSplit();

            if ( editorOptions.updateServer ) 
                editorOptions.updateServer();

            doDrawingAndTable();
        };

        var fullPageButton = controls.append("button")
                                     .attr("class", "btn btn-default toggle-full-page")
                                     .html( '<i class="icon-fullscreen" />' )
                                     .on("click", toggleFullScreen );
    }

    //if ( editorOptions.includeFullPageOption )
    {
        var toggleShowFormulas = function() {
            d3.event.preventDefault();
            editorOptions.showFormulas = ! editorOptions.showFormulas;
            d3.select(this).text( editorOptions.showFormulas ? "hide formulas" : "show formulas" );
            doDrawingAndTable();
        };

        var toggleShowFormulas = controls.append("button")
                                     .attr("class", "btn btn-default toggle-show_formulas")
                                     .text( editorOptions.showFormulas ? "hide formulas" : "show formulas" )
                                     .on("click", toggleShowFormulas );
    }    

    if ( pattern.wallpapers )
    {
        initialiseWallpapers( pattern, editorOptions.interactionPrefix );

        var wallpaperControlsGroups = controls.append("table").attr("class","wallpapers");
        wallpaperControlsGroups.selectAll("tr")
            .data( pattern.wallpapers )
            .enter()
            .append("tr")
            .attr( "class", function(w) { return w.hide ? 'wallpaper-hidden' : null; } )
            .each( function(wallpaper,i){                
                var wallpaperDiv = d3.select(this);
                wallpaperDiv.append( "td" ).html( function(w) { return w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      w.hide = ! w.hide; 
                                                                      d3.select(this).html( w.hide ? '<i class="icon-eye-close"/>' : '<i class="icon-eye-open"/>' );
                                                                      d3.select(this.parentNode).attr( "class", w.hide ? 'wallpaper-hidden' : null );
                                                                      w.updateServer();
                                                                      var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                      doWallpapers( wallpaperGroups, pattern );                                                              
                                                                     } );
                wallpaperDiv.append( "td" ).html( function(w) { return w.editable ? '<i class="icon-unlock"/>' : w.allowEdit ? '<i class="icon-lock"/>' : '<i class="icon-lock disabled"/>' } )
                                           .on("click", function(w) { d3.event.preventDefault(); d3.event.stopPropagation();
                                                                      if ( w.allowEdit )
                                                                      {
                                                                        w.editable = ! w.editable; 
                                                                        d3.select(this).html( w.editable ? '<i class="icon-unlock"/>' : '<i class="icon-lock"/>' );
                                                                        var wallpaperGroups = graphdiv.select( "g.wallpapers");
                                                                        doWallpapers( wallpaperGroups, pattern );                                                              
                                                                      }
                                                                     } );
                wallpaperDiv.append( "td" ).text( wallpaper.filename ? wallpaper.filename : wallpaper.imageurl );
                                                                     //icon-lock icon-unlock icon-move icon-eye-open icon-eye-close
            });
    }
}


function initialiseWallpapers( pattern, interactionPrefix )
{    
    var updateServer = ( typeof goGraph === "function" ) ? function(e) {
        var kvpSet = newkvpSet(true) ;
        kvpSet.add('offsetX', this.offsetX ) ;
        kvpSet.add('offsetY', this.offsetY ) ;
        kvpSet.add('scaleX', this.scaleX * defaultScale ) ;
        kvpSet.add('scaleY', this.scaleY * defaultScale ) ;
        kvpSet.add('opacity', this.opacity ) ;
        kvpSet.add('visible', ! this.hide ) ;
        goGraph(interactionPrefix + ':' + this.update, fakeEvent(), kvpSet) ;    
    } : function(e){};

    var wallpapers = pattern.wallpapers; 
    for( var i=0; i<wallpapers.length; i++ )
    {
        var w = wallpapers[i];

        if ( ! w.initialised )
        {
            //A 720px image is naturally 10in (at 72dpi)
            //If our pattern as 10in across then our image should be 10 units.
            //If our pattern was 10cm across then our image should be 25.4 units and we would expect to need to specify a scale of 1/2.54
            var defaultScale = 72;
            if ( pattern.units === "cm" )
            {
                defaultScale = 72 / 2.54;
            }
            else if ( pattern.units === "mm" )
            {
                defaultScale = 72 / 25.4;
            }
            w.scaleX = w.scaleX / defaultScale /*dpi*/; //And adjust by pattern.units
            w.scaleY = w.scaleY / defaultScale /*dpi*/;
            w.hide = ( w.visible !== undefined ) && (! w.visible );
            w.allowEdit = ( w.allowEdit === undefined ) || ( w.allowEdit );
            
            //w.dimensionsKnown = dimensionsKnown;
            $("<img/>") // Make in memory copy of image to avoid css issues
                .attr("src", w.imageurl )
                .attr("data-wallpaper", i)
                .on( "load", function() {
                    //seems like we can't rely on closure to pass w in, it always   points to the final wallpaper
                    w = wallpapers[ this.dataset.wallpaper ];
                    w.width = this.width;   // Note: $(this).width() will not
                    w.height = this.height; // work for in memory images.
                    //console.log( "jquery Image loaded w.imageurl " + w.imageurl + " width:" + w.width + " height:" + w.height);
                    //console.log( "Wallpaper dimensions known. Image loaded w.imageurl width:" + w.width + " height:" + w.height );
                    if ( w.image )
                    {
                        //console.log( " setting d3Image dimentions." );
                        d3.select( w.image ).attr("width", w.width );        
                        d3.select( w.image ).attr("height", w.height );        
                    }
                });
                
            if ( updateServer )
                w.updateServer = updateServer;

            w.initialised = true;
        }    
    }
}


//http://bl.ocks.org/humbletim/5507619
function scrollTopTween(scrollTop) 
{
    return function() {
        var i = d3.interpolateNumber(this.scrollTop, scrollTop);
        //console.log( "function1: ", this.scrollTop, " - ", scrollTop );
        return function(t) { 
            this.scrollTop = i(t); 
            //console.log( "function2: ", this.scrollTop );
        };
    }
}
  

//Do the drawing... (we've added draw() to each drawing object.
function doDrawing( graphdiv, pattern, editorOptions, contextMenu, focusDrawingObject )
{
    var layoutConfig = editorOptions.layoutConfig;
    var margin = 0;//layoutConfig.drawingMargin;//25;    ///XXX why a margin at all?
    var width =  layoutConfig.drawingWidth;
    var height = layoutConfig.drawingHeight;

    graphdiv.select("svg.pattern-drawing").remove();

    var svg = graphdiv.append("svg")
                       .attr("class", "pattern-drawing" )
                       .attr("width", width + ( 2 * margin ) )
                       .attr("height", height + ( 2 * margin ));

    //var transformGroup1 = svg.append("g")
    //                        .attr("transform", "translate(" + ( margin ) + "," + ( margin ) + ")");
    var transformGroup1 = svg.append("g");
                            //.attr("transform", "translate(" + ( editorOptions.translateX ) + "," + ( editorOptions.translateY ) + ") scale(" + editorOptions.scale + ")");

    var patternWidth = ( pattern.bounds.maxX - pattern.bounds.minX );
    var patternHeight =( pattern.bounds.maxY - pattern.bounds.minY );

    var scaleX = width / patternWidth;                   
    var scaleY = height / patternHeight;           
    
    if ( ( isFinite( scaleX ) ) && ( isFinite( scaleY ) ) )
        scale = scaleX > scaleY ? scaleY : scaleX;
    else if ( isFinite( scaleX ) )
        scale = scaleX;
    else
        scale = 1;

    //console.log( "scale:" + scale + " patternWidth:" + patternWidth + " width:" + width );

    //transformGroup2 scales from calculated positions in pattern-space (e.g. 10 representing 10cm) to
    //pixels available. So 10cm in a 500px drawing has a scale of 50. 
    var transformGroup2 = transformGroup1.append("g")
        .attr("transform", "scale(" + scale + "," + scale + ")");

    //centralise horizontally                            
    var boundsWidth = pattern.bounds.maxX - pattern.bounds.minX;
    var availableWidth = width / scale;
    var offSetX = ( availableWidth - boundsWidth ) /2;

    //transformGroup3 shifts the position of the pattern, so that it is centered in the available space. 
    var transformGroup3 = transformGroup2.append("g")
                               .attr("class","pattern")
                               .attr("transform", "translate(" + ( ( -1.0 * ( pattern.bounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.bounds.minY ) ) + ")");    

    if ( pattern.wallpapers )
    {
        var wallpaperGroups = transformGroup2.append("g")
                                             .attr("class","wallpapers")
                                             .attr("transform", "translate(" + ( ( -1.0 * ( pattern.bounds.minX - offSetX ) ) ) + "," + ( ( -1.0 * pattern.bounds.minY ) ) + ")")   
                                             .lower();
        doWallpapers( wallpaperGroups, pattern );
    }
     
    //Clicking on an object in the drawing should highlight it in the table.
    var onclick = function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,true);
    };

    for( var j=0; j< pattern.patternPieces.length; j++ )
    {
        var patternPiece = pattern.patternPieces[j];

        var outlineGroup = transformGroup3.append("g").attr("class","j-outline");
        var drawingGroup = transformGroup3.append("g").attr("class","j-drawing");

        var a = drawingGroup.selectAll("g");    
        a = a.data( patternPiece.drawingObjects );
        a.enter()
         .append("g")
         //.attr("class", "j-point")
         .on("contextmenu", contextMenu)
         .on("click", onclick)
         .each( function(d,i) {
            var g = d3.select( this );            
            if (( typeof d.draw === "function" ) && ( ! d.error ))
            {
                d.draw( g );
                d.drawingSvg = g;                 
            }
        });

        var a = outlineGroup.selectAll("g");    
        a = a.data( patternPiece.drawingObjects );
        a.enter()
         .append("g")
         //.attr("class", "j-outline")
         .on("contextmenu", contextMenu)
         .on("click", onclick)
         .each( function(d,i) {
            var g = d3.select( this );
            if (( typeof d.draw === "function" ) && ( ! d.error ))
            {
                d.draw( g, true );
                d.outlineSvg = g;
            }
        });        
    };

    var updateServerAfterDelay = function()
    {
        //Lets only update the server if we've stopped panning and zooming for > 1s.
        timeOfLastTweak = (new Date()).getTime();
        if ( ! updateServerTimer )
        {
            var updateServerTimerExpired = function () {

                updateServerTimer = null;          
                //console.log("Zoom update server timer activated. TimeOfLastTweak:" + timeOfLastTweak + " Now:" + (new Date()).getTime());

                if ( (new Date()).getTime() >= ( timeOfLastTweak + 500 ) )
                {
                    var zt = d3.zoomTransform( transformGroup1.node() );
                    if ( editorOptions.updateServer )
                        editorOptions.updateServer( zt.k, zt.x, zt.y );
                }
                else
                    updateServerTimer = setTimeout(updateServerTimerExpired, 500);
            }

            updateServerTimer = setTimeout(updateServerTimerExpired, 500);
        }           
    };

    var zoomed = function() {
        transformGroup1.attr("transform", d3.event.transform);

        var currentScale = d3.zoomTransform( transformGroup1.node() ).k; //do we want to scale 1-10 to 1-5 for fonts and linewidths and dots?
        if (   ( currentScale > (1.1*fontsSizedForScale) )
            || ( currentScale < (0.9*fontsSizedForScale) )
            || ( currentScale == 1 ) || ( currentScale == 8 ) )
        {
            if ( ! fontResizeTimer )
            {
                fontResizeTimer = setTimeout(function () {      
                    fontResizeTimer = null;          
                    fontsSizedForScale = d3.zoomTransform( transformGroup1.node() ).k;
                    //console.log( "Resize for " + fontsSizedForScale);

                    for( var j=0; j< pattern.patternPieces.length; j++ )
                    {
                        var patternPiece = pattern.patternPieces[j];
                
                        for( var i=0; i< patternPiece.drawingObjects.length; i++ )
                        {
                            var a = patternPiece.drawingObjects[i];
                            var g = a.drawingSvg;                            
                            if ( g )
                            {
                                var labelPosition = a.labelPosition();

                                if ( labelPosition )
                                {
                                    g.selectAll( "text" )
                                    .attr("font-size", labelPosition.fontSize + "px")
                                    .attr("x", labelPosition.labelX )
                                    .attr("y", labelPosition.labelY );

                                    g.selectAll( "line.labelLine" )
                                    .attr("x2", labelPosition.labelLineX )
                                    .attr("y2", labelPosition.labelLineY );
                                }
                       
                                g.selectAll( "circle" )
                                .attr("r", Math.round(400 / scale / fontsSizedForScale)/100 );

                                {
                                    var strokeWidth = a.getStrokeWidth( false, (selectedObject==a) );

                                    g.selectAll( "line" )
                                        .attr( "stroke-width", strokeWidth );

                                    g.selectAll( "path" )
                                        .attr( "stroke-width", strokeWidth );            
                                }
                            }

                            g = a.outlineSvg;
                            if ( g )
                            {
                                var strokeWidth = a.getStrokeWidth( true );

                                g.selectAll( "line" )
                                .attr( "stroke-width", strokeWidth );

                                g.selectAll( "path" )
                                .attr( "stroke-width", strokeWidth );           

                                g.selectAll( "circle" )
                                    .attr("r", Math.round( 1200 / scale / fontsSizedForScale )/100 );
                            }
                        }        
                    }
                }, 50);         
            }
        }
        updateServerAfterDelay();         
    };           

    fontsSizedForScale = 1; //the starting scale of transformGroup1.
    if ( editorOptions.allowPanAndZoom )
    {
        //TODO just the fontsize needs setting initially to take editorOptions.scale into account

        var transform = d3.zoomIdentity.translate(editorOptions.translateX, editorOptions.translateY).scale(editorOptions.scale);
        var zoom = d3.zoom()
                    .extent([[0, 0], [width, height]])
                    .scaleExtent([0.5, 8])
                    .on("zoom", zoomed);
        svg.call( zoom)
           .call(zoom.transform, transform);

        fontsSizedForScale = editorOptions.scale;
    }
}


function doWallpapers( wallpaperGroups, pattern )
{
    var visibleWallpapers = [];
    for( var i=0; i<pattern.wallpapers.length; i++ )
    {
        var w = pattern.wallpapers[i];

        if ( ! w.hide )
            visibleWallpapers.push( w );
    }

    var drag = d3.drag()
        .on("start", function(wallpaper) {
            //var wallpaperG = d3.select(this);
            //if ( ! wallpaper.editable )
            //    return;
            wallpaper.offsetXdragStart = wallpaper.offsetX - d3.event.x;
            wallpaper.offsetYdragStart = wallpaper.offsetY - d3.event.y;
        })
        .on("drag", function(wallpaper) {
            //if ( ! wallpaper.editable )
            //    return;
            var wallpaperG = d3.select(this);        
            wallpaper.offsetX = wallpaper.offsetXdragStart + d3.event.x;
            wallpaper.offsetY = wallpaper.offsetYdragStart + d3.event.y;
            wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
        })
        .on("end", function(wallpaper){
            wallpaper.updateServer( d3.event );
        });

    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers, function(d){return d.filename} )
                    //.filter(function(w){return !w.hide;})
                    .enter()
                    .append("g")
                    .attr( "class", function(w){ return w.editable ? "wallpaper editable" : "wallpaper" } )
                    .attr("transform", function(wallpaper) { return  "translate(" + ( wallpaper.offsetX ) + "," + ( wallpaper.offsetY ) + ")"
                                                                    + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + ")" } )
                    .append( "image" )
                    //.on( "load", function(w) {
                    //    console.log("d3 image loaded");
                    //})
                    .attr( "href", function(w) { return w.imageurl } )
                    .attr( "opacity", function(w) { return w.opacity } )
                    .each( function(w){
                        //Set this up so that we can later use dimensionsKnown()
                        console.log("** added d3 image and setting w.image width:" + w.width + " height:" + w.height );
                        w.image = this; 
                        //if we know the dimensions already, set them! (Safari needs this on showing a hidden wallpaper)
                        d3.select(this).attr( "width",w.width);
                        d3.select(this).attr( "height",w.height);
                    } );

    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers, function(d){return d.filename} )
                    .exit().remove();

    var resize = d3.drag()
                    .on("start", function(wallpaper) {
                        wallpaper.offsetXdragStart = d3.event.x - wallpaper.width;
                        wallpaper.offsetYdragStart = d3.event.y - wallpaper.height;
                        //console.log("start offsetXdragStart:" + wallpaper.offsetXdragStart );
                    })
                    .on("end", function(wallpaper) {
                        var wallpaperG = d3.select(this.parentNode);
                        var circle = d3.select(this);
                        var rect = wallpaperG.select("rect");
                        var ratio = circle.attr("cx") / wallpaper.width;     
                        var scaleXbefore = wallpaper.scaleX;                   
                        wallpaper.scaleX = wallpaper.scaleX * ratio; //fixed aspect?
                        wallpaper.scaleY = wallpaper.scaleY * ratio;
                        //console.log( "cx:" + circle.attr("cx") + " image:" + wallpaper.width + "  ratio:" + ratio + "  scaleXbefore:" + scaleXbefore + "  scaleXNow:" + wallpaper.scaleX );
                        wallpaperG.attr("transform", "translate(" + wallpaper.offsetX + "," + wallpaper.offsetY + ") " + " scale(" + wallpaper.scaleX + "," + wallpaper.scaleY + " )" );
                        circle.attr("cx", wallpaper.width )
                              .attr("cy", wallpaper.height );
                        rect.attr("width", wallpaper.width )
                            .attr("height", wallpaper.height );
                        wallpaper.updateServer( d3.event );
                    } )
                    .on("drag", function(wallpaper) {
                        var wallpaperG = d3.select(this.parentNode);
                        var circle = d3.select(this);
                        var rect = wallpaperG.select("rect");
                        var newX = d3.event.x - wallpaper.offsetXdragStart;
                        var newY = d3.event.y - wallpaper.offsetYdragStart;
                        //console.log("drag d3.event.x:" + d3.event.x + "  newX:" + newX );
                        if ( true ) //fixed aspect
                        {
                            var ratioX = newX / wallpaper.width;
                            var ratioY = newY / wallpaper.height;
                            var ratio = (ratioX+ratioY)/2.0;
                            newX = ratio * wallpaper.width;
                            newY = ratio * wallpaper.height;
                        }
                        circle.attr("cx", newX )
                                .attr("cy", newY );
                        rect.attr("width", newX )
                            .attr("height", newY );
                    });

    //Add a resizing boundary to each editable wallpaper.                 
    wallpaperGroups.selectAll("g")
                    .data( visibleWallpapers,function(d){return d.filename} )
                    //.filter(function(w){return !w.hide;})
                    .each( function(w,i) {
                        var g = d3.select(this);
                        //This worked on Firefox and Chrome, but not Safari.
                        //var box = g.node().getBBox();
                        //w.width = box.width;
                        //w.height = box.height;

                        if ( w.editable )
                        {
                            g.append("rect")
                            .attr("x",0)
                            .attr("y",0)
                            .attr("stroke", "red")
                            .attr("fill", "none")
                            .attr("width", w.width)
                            .attr("height", w.height);
    
                            g.append( "circle") 
                            .attr("cx", function(w) { return w.width } )
                            .attr("cy", function(w) { return w.height } )
                            .attr("r", 10 / scale / w.scaleX / fontsSizedForScale )
                            .attr("fill", "red")
                            .call(resize);
                            
                            g.call(drag);
                        }
                        else
                        {
                            g.select("rect").remove();
                            g.select("circle").remove();
                            g.on(".drag", null );
                        }
                    } );
    //resize(wallpaperGroups.selectAll("g > circle"));            
}


function doTable( graphdiv, pattern, editorOptions, contextMenu, focusDrawingObject )
{
    var patternPiece1 = pattern.patternPieces[0];
    var layoutConfig = editorOptions.layoutConfig;
    var margin = layoutConfig.tableMargin;//25; 
    var width =  layoutConfig.tableWidth;//400;
    var height = layoutConfig.tableHeight;//600;
    var minItemHeight = 30; //should not be required
    var itemMargin = 8;
    var itemWidth = width *3/4;
    var ypos = 0;
    var seq = 1; //TODO get these in the XML as data?
    var asFormula = editorOptions.showFormulas; 

    var onclick = function(d) {
        d3.event.preventDefault();
        focusDrawingObject(d,false);
    }

    graphdiv.select("div.pattern-table").remove();

    var combinedDrawingObjects = pattern.patternPieces.length == 1 ? pattern.patternPieces[0].drawingObjects 
                                                                   : pattern.patternPieces[0].drawingObjects.concat( pattern.patternPieces[1].drawingObjects);
    for( var j=2; j< pattern.patternPieces.length; j++ )
    {
        combinedDrawingObjects = combinedDrawingObjects.concat( pattern.patternPieces[2].drawingObjects);
    }

    var svg = graphdiv.append("div")
                      .attr("class", "pattern-table")
                      .style( "height", height +"px" )    
                      .append("svg")
                      .attr("width", width + ( 2 * margin ) )
                      .attr("height", minItemHeight * combinedDrawingObjects.length );    

    var a = svg.selectAll("g");
    a = a.data( combinedDrawingObjects );
    a.enter()        
    .append("g")
    .each( function(d,i) {

        var divHeight = function(that) {

            //this - the dom svg element
            //that - the data object

            //console.log( "divHeight() of this:" + this + " that:" + that );

            //var div = $(this).find( "div.nodedesc" );
            var h = $(this).find( "div.outer" ).height();
            
            if ( h < minItemHeight )
                return minItemHeight;
            return h;
            
        };

        var g = d3.select( this );

        g.attr( "class", "j-item") ;

        if ( d.error )
            g.attr( "class", "j-item error") ;

        d.tableSvg = g;
        d.tableSvgX = itemWidth;
        d.tableSvgY = ypos + ( 0.5 * minItemHeight );

        var fo = g.append( "foreignObject" )
        .attr( "x", 0 )
        .attr( "y", function (d) { 
             return ypos;
         } )
         .attr( "width", itemWidth  );

        var html;
        try {
            html = d.html( asFormula );
            if (d.error)
                html += '<div class="error">' + d.error + '</div>';
        } catch ( e ) {
            html = "Failed to generate description.";
        }

         var div = fo.append( "xhtml:div" )
           .attr("class","outer")
           .append( "xhtml:div" )
           .attr("class","desc")
           .html( html );

        fo.attr( "height", 1 ); //required by firefox otherwise bounding rects returns nonsense
        fo.attr( "height", divHeight );

        g.attr( "height", divHeight )
        .attr( "y", function (d) { 
                                    //Get the height of the foreignObject.
                                    var h = this.childNodes[0].getBoundingClientRect().height;
                                    ypos += h + itemMargin; 
                                    //console.log("y: " + ypos );
                                    return ypos } )

        g.on("contextmenu", contextMenu)
         .on("click", onclick );
    });                   
        
    svg.attr("height", ypos );    

    linksGroup = svg.append("g")
                    .attr("class", "links");

    //Links area is width/4 by ypos.            
    var linkScale = (width/4) / Math.log( Math.abs( ypos /30 ) );   
    drawLinks( patternPiece1, linkScale );
}


function drawLinks( patternPiece, linkScale )
{
    var linkData = patternPiece.dependencies.dependencies;

    linksGroup.selectAll("path.link") //rename .link to .dependency
                    .data(linkData)
                    .enter().append("path")
                    .attr("class", "link" )
                    .attr("d", function( link ) {
                        var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
                            x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;
                    
                        var dx = x0 - x1,
                            dy = y0 - y1,
                            l = Math.log( Math.abs(dy /30 ) ) * linkScale;
                    
                        var path = d3.path();
                        path.moveTo( x0, y0 );
                        path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
                        return path;                      
                    } );
                    //.attr("d", curve);
}


/*
 * Curve that connects items in the table.
 */
function curve(link) {
    var x0 = link.source.tableSvgX, y0 = link.source.tableSvgY,
        x1 = link.target.tableSvgX, y1 = link.target.tableSvgY;

    var dx = x0 - x1,
        dy = y0 - y1,
        l = Math.log( Math.abs(dy /30 ) ) * 50;

    var path = d3.path();
    path.moveTo( x0, y0 );
    path.bezierCurveTo( x0+l , y0, x1+l, y1, x1, y1 );
    return path;                      
}


function newkvpSet(noRefresh)
{
    var kvp = { } ;
    kvp.kvps = new Array() ;

    kvp.add = function (k, v)
    {
        this.kvps.push ( {k: k, v: v} ) ;
    } ;

    kvp.toString = function (p)
    {
        var r = '' ;

        for (var i = 0 ; i < this.kvps.length ; i++)
        {
            r += '&' + p + this.kvps[i].k + '=' + this.kvps[i].v ;
        }

        return r ;
    } ;

    if (noRefresh)
        kvp.add("_noRefresh", -1) ;

    return kvp ;
}


function fakeEvent(location, x, y)
{
    var pXY = {x: 0, y: 0} ;
    
    if (location !== undefined)
    {
        pXY = getElementXY(location) ;
        pXY.x = Math.round(pXY.x + x) ;
        pXY.y = Math.round(pXY.y + y) ;
    }
    else
    {
        pXY.x = Math.round(x) ;
        pXY.y = Math.round(y) ;
    }
    
    // event to satisfy goGraph's requirements
    return { target: location, pageX: 0, pageY: 0, processedXY: pXY } ;
}


export{ PatternPiece, doDrawing, doTable, drawPattern  };