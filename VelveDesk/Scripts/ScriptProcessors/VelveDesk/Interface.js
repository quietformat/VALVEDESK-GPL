Content.makeFrontInterface(830, 606);

//! DATA Definitions

// The number of EQ bands. If you need more, just add numbers here...
const var DEFAULT_FREQUENCIES = [200, 1000, 4000]

const var NUM_FILTER_BANDS = DEFAULT_FREQUENCIES.length;

// The value range & default parameters of each band. This will be used
// by the node builder below to create the scriptnode EQ modules
const var BAND_PARAMETERS = {
    Gain: {
	    min: -18.0,
	    max: 18.0,
	    defaultValue: 0.0,
	    mode: "Decibel"
    },
    Frequency: {
	    min: 20.0,
	    max: 20000.0,
	    middlePosition: 1500.0,
	    defaultValue: 1000.0,
	    mode: "Frequency"
    },
    Q: {
	    min: 0.3,
	    max: 9.9,
	    middlePosition: 1.0,
	    defaultValue: 0.8
    },
    Enabled: {
	    min: 0.0,
	    max: 1.0,
	    stepSize: 1.0,
	    defaultValue: 1.0
    },
    Mode: {
	    min: 0.0,
	    max: 4.0,
	    stepSize: 1.0,
	    defaultValue: 4.0 // peak
    }
};



// This JSON defines how the module's attributes are correlated to the filter's
// parameters (so that the dragging operations know what parameters to change & update from).
// Note that the only limitation here is to have a fixed number of bands -
// the only module that allows dynamically adding & removing filters is the Curve EQ
const var CUSTOM_EQ_DATA = {
  NumFilterBands: NUM_FILTER_BANDS, 
  FilterDataSlot: 0, // the coefficients are using the slot #1
  FirstBandOffset: 0, // the first parameter for the eq is 0 (in this case B1G)
  TypeList: [
    "Low Pass", // We're mirroring the exact filter modes & order from the Parametriq EQ
    "High Pass",
    "Low Shelf",
    "High Shelf",
    "Peak"
  ],
  ParameterOrder: [
    "Gain", // Same with the parameter order
    "Freq",
    "Q",
    "Enabled",
    "Type"
  ],
  FFTDisplayBufferIndex: -1, // no FFT analyser for our example
  DragActions: {
    DragX: "Freq",
    DragY: "Gain", // this updates the gain when you drag vertically
    ShiftDrag: "Q", // (for a filter with a single band you can reroute this to Q)
    DoubleClick: "", // By default this is set to change the Enabled parameter, but we don't want that (see below)
    RightClick: ""
  }
};

// this is the data we'll pass into the floating tile.
const var FT_DATA = {
	Type: "DraggableFilterPanel",
	ProcessorId: "Script FX1",
	AllowFilterResizing: false, // no resizing
	ResetOnDoubleClick: true, // if you want to reset the band on double click, set this to true and the "DoubleClick" parameter in the DragActions property above to an empty string (so that it doesn't hardwire the action to the Enabled parameter).
	PathType: "FillMinimal" // use another path render type because why not...
};

// get the reference as FX
const var fx = Synth.getEffect("Script FX1");
// get the reference as slot
const var slot = Synth.getSlotFX("Script FX1");

//! Node BUILDER
// Now we will use the Scriptnode API to dynamically create all nodes
// and hook up the connections. Since this is a very tedious process if
// done manually it is a prime example for when and how to use the scripting
// API for this...

// create an internal network
const var network = slot.setEffect("eq");

// reset the network on each compilation to ensure that there is nothing lurking around
network.clear(true, true);

// grab the root node
const var rootNode = network.get("eq");

// set it to horizontal mode (so that all eqs are arranged horizontally)
rootNode.set("IsVertical", false);
rootNode.set("ShowParameters", true);

for(i = 0; i < NUM_FILTER_BANDS; i++)
{
    // create a SVF filter node
    var eq = network.create("filters.svf_eq", "B" + (i+1));
    
    // add it to the root node
    eq.setParent("eq", -1);
    
    for(bp in BAND_PARAMETERS)
    {
        // Now we create the JSON data for the root node parameters
        var bpn = "B"+(i+1) + bp;

        // We need to clone that object so that it doesn't override the reference
        var pobj = BAND_PARAMETERS[bp].clone();
        
        if(bp == "Frequency")
            pobj.defaultValue = DEFAULT_FREQUENCIES[i];

        // ← 여기를 추가
        if(bp == "Mode") {
            // CUSTOM_EQ_DATA.TypeList 기준 인덱스: 0:Low Pass,1:High Pass,2:Low Shelf,3:High Shelf,4:Peak
            var modeDefaults = [2, 4, 3]; // B1:Low Shelf, B2:Peak, B3:High Shelf
            pobj.defaultValue = modeDefaults[i];
        }
        // ← 추가 끝
        
        // set the ID to the parameter name
        pobj.ID = bpn;
        
        // create the root parameter
        var src = rootNode.getOrCreateParameter(pobj);
        
        // fetch the parameter from the SVF EQ node
        var dst = eq.getParameter(bp);
        
        // connect the parameters
        dst.addConnectionFrom({
            ID: "eq",
            ParameterId: bpn
        });
        
        // make sure that there is no subtle range mismatch (aka warning button)
        src.setRangeFromObject(dst.getRangeObject());
    }
    
    // set the eq node to use the first filter data slot.
    eq.setComplexDataIndex("Filter", 0, 0);
}


// Now we pass the draggable filter data to the scriptnode module
fx.setDraggableFilterData(CUSTOM_EQ_DATA);

const var ft = Content.addFloatingTile("FD", 252, 0);

ft.set("width", 559);
ft.set("height", 325);

// Last but not least, give the floating tile the JSON data we defined above




const var LevelMeter = Content.getComponent("LevelMeter");
const var SimpleGain1 = Synth.getEffect("SimpleGain1");

// Decay Rate
const var DECAY_RATE = 0.95;

// Current Values
var curLevel = 0.0;

// Timer Callback
const var t = Engine.createTimerObject();
t.setTimerCallback(function()
{
    // Synth Values (L/R 평균)
    var Level = (SimpleGain1.getCurrentLevel(1) + SimpleGain1.getCurrentLevel(0)) / 2;

    // Peak Synth Values
    var peakLevel = Math.max(Level, Level);

    if (peakLevel > curLevel)
    {
        curLevel = peakLevel;
    }
    else
    {
        curLevel *= DECAY_RATE;
    }

    // Decibel Conversion
    Level = Engine.getDecibelsForGainFactor(curLevel);

    // Set Values
    LevelMeter.setValue(Level);
});

t.startTimer(30);



const pageAdvanced = Content.getComponent("pageAdvanced");

const btnToggleSet2 = Content.getComponent("btnTogglePage2"); 

inline function onToggleSet2Click(c, v)
{
    pageAdvanced.set("visible", v == 1);
    if (v == 0) btnToggleSet2.setValue(0);
}
btnToggleSet2.setControlCallback(onToggleSet2Click);
function onNoteOn()
{
	
}
 function onNoteOff()
{
	
}
 function onController()
{
	
}
 function onTimer()
{
	
}
 function onControl(number, value)
{
	
}
 