	 ______  __ __    ___  ____   ___ ___  ____  ___   ____   ____  __  _ 
	|      ||  |  |  /  _]|    \ |   |   ||    |/   \ |    \ |    ||  |/ ]
	|      ||  |  | /  [_ |  D  )| _   _ | |  ||     ||  _  | |  | |  ' / 
	|_|  |_||  _  ||    _]|    / |  \_/  | |  ||  O  ||  |  | |  | |    \ 
	  |  |  |  |  ||   [_ |    \ |   |   | |  ||     ||  |  | |  | |     |
	  |  |  |  |  ||     ||  .  \|   |   | |  ||     ||  |  | |  | |  .  |
	  |__|  |__|__||_____||__|\_||___|___||____|\___/ |__|__||____||__|\_|
	
Industrial Automation inspired programming languages directly converted to Arduino C code.

# Features
- Direct generation of human readable C code compatible with the Arduino HAL
- Export / Import in JSON format

Each block:
- Can have multiple inputs (on the left) and outputs (on the right)
- Contain two code sections: Setup code and Loop code
- Contain a structure used for data, like an instance of a class
- Can contain other blocks, that contains other blocks, that contains oth....... Segmentation Fault

# Languages
Thermonik get deep inspiration from Industrial Automation languages like FDB, GRAPH and LADDER.
But optimized to be more appealing and easy to use for hobbiest geeks.
It also include direct C coding (much envied in Automation).

So, to recap.
A block can be created in:

## (WL) Wiring Language
(WL is the equivalent of FDB for Industrial Automation)

It uses a grid composed of wires and blocks.
Each wire is routed in straight lines next to the blocks to avoid confusions.

[example images]

## (CL) Cycle Language
(CL is the equivalent of GRAPH for Industrial Automation)

It uses Steps and Transitions to allow a sequential logic.
Each Step remains active until the following Transition is satisfied.

Transition code is written in WL.

[example images]

## (C) Direct C code

You can use normal trusted C code to allow advanced functions and full backward compatibility with examples, tutorials, old projects and Copy&Paste from StackOverflow tecnique .

[example images]

# Nerdy stuff
The Block class is composed as follow:
	Block {
		interface {
			inputs // Dictionary of input classes
			outputs // Dictionary of outputs classes
		}
		
		configs // Dictionary of all the block configs

		gui {
			svgBody // SVG object of the block body
			svgName // SVG object of the name label
			svgInterfaces // List of SVG objects of the interfaces (inputs, outputs)
		}
	}

Hardware is abstracted by the use of a Board class, composed as follow:
	Board {
	}

