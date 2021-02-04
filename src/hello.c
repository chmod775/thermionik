/*     ______  __ __    ___  ____   ___ ___  ____  ___   ____   ____  __  _  */
/*    |      ||  |  |  /  _]|    \ |   |   ||    |/   \ |    \ |    ||  |/ ] */
/*    |      ||  |  | /  [_ |  D  )| _   _ | |  ||     ||  _  | |  | |  ' /  */
/*    |_|  |_||  _  ||    _]|    / |  \_/  | |  ||  O  ||  |  | |  | |    \  */
/*      |  |  |  |  ||   [_ |    \ |   |   | |  ||     ||  |  | |  | |     | */
/*      |  |  |  |  ||     ||  .  \|   |   | |  ||     ||  |  | |  | |  .  | */
/*      |__|  |__|__||_____||__|\_||___|___||____|\___/ |__|__||____||__|\_| */

#include <stdlib.h>
#include <unistd.h>
#include <stdbool.h>

/* ##### block oneshot by Anonymous ##### */
typedef struct {
	bool lastval;
} _s_data_oneshot;
typedef struct {
	bool out;
} _s_outputs_oneshot;
typedef struct {
	_s_data_oneshot data;
	_s_outputs_oneshot outputs;
} _s_instance_oneshot;
void setup_oneshot(_s_data_oneshot* data) {
	
}
void loop_oneshot(_s_data_oneshot* data, bool in, bool* out) {
	
	      *out = (in && !data->lastval);
	      data->lastval = in;
	      
}
/* ##### block counter by Michele Trombetta ##### */
typedef struct {
	int value;
} _s_data_counter;
typedef struct {
	int actValue;
	bool atTarget;
} _s_outputs_counter;
typedef struct {
	_s_data_counter data;
	_s_outputs_counter outputs;
} _s_instance_counter;
void setup_counter(_s_data_counter* data) {
	
	      data->value = 0;
	      
}
void loop_counter(_s_data_counter* data, bool inc, bool reset, int* actValue, bool* atTarget) {
	
	      if (inc)
	        data->value++;
	      *actValue = data->value;
	      *atTarget = (data->value >= data->atTarget);
	      
}
/* ##### block and_15c80cfc by Anonymous ##### */
typedef struct {
} _s_data_and_15c80cfc;
typedef struct {
	bool out;
} _s_outputs_and_15c80cfc;
typedef struct {
	_s_data_and_15c80cfc data;
	_s_outputs_and_15c80cfc outputs;
} _s_instance_and_15c80cfc;
void setup_and_15c80cfc(_s_data_and_15c80cfc* data) {
	
}
void loop_and_15c80cfc(_s_data_and_15c80cfc* data, bool in_0, bool in_1, bool in_2, bool in_3, bool in_4, bool in_5, bool in_6, bool in_7, bool in_8, bool in_9, bool* out) {
	*out = in_0 && in_1 && in_2 && in_3 && in_4 && in_5 && in_6 && in_7 && in_8 && in_9;
}
/* ##### block and_42c45509 by Anonymous ##### */
typedef struct {
} _s_data_and_42c45509;
typedef struct {
	bool out;
} _s_outputs_and_42c45509;
typedef struct {
	_s_data_and_42c45509 data;
	_s_outputs_and_42c45509 outputs;
} _s_instance_and_42c45509;
void setup_and_42c45509(_s_data_and_42c45509* data) {
	
}
void loop_and_42c45509(_s_data_and_42c45509* data, bool in_0, bool in_1, bool* out) {
	*out = in_0 && in_1;
}
/* ##### block main by Anonymous ##### */
typedef struct {
	_s_instance_oneshot b_1;
	_s_instance_counter b_2;
	_s_instance_counter b_3;
	_s_instance_and_15c80cfc b_4;
	_s_instance_and_15c80cfc b_5;
	_s_instance_and_42c45509 b_6;
} _s_data_main;
typedef struct {
} _s_outputs_main;
typedef struct {
	_s_data_main data;
	_s_outputs_main outputs;
} _s_instance_main;
void setup_main(_s_data_main* data) {
	setup_oneshot(&data->b_1.data);
	setup_counter(&data->b_2.data);
	setup_counter(&data->b_3.data);
	setup_and_15c80cfc(&data->b_4.data);
	setup_and_15c80cfc(&data->b_5.data);
	setup_and_42c45509(&data->b_6.data);
}
void loop_main(_s_data_main* data) {
	loop_oneshot(
		&data->b_1.data,
		true,
		&data->b_1.outputs.out
	);
	loop_counter(
		&data->b_2.data,
		data->b_1.outputs.out,
		data->b_6.outputs.out,
		&data->b_2.outputs.actValue,
		&data->b_2.outputs.atTarget
	);
	loop_counter(
		&data->b_3.data,
		false,
		data->b_1.outputs.out,
		&data->b_3.outputs.actValue,
		&data->b_3.outputs.atTarget
	);
	loop_and_15c80cfc(
		&data->b_4.data,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		&data->b_4.outputs.out
	);
	loop_and_15c80cfc(
		&data->b_5.data,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		false,
		&data->b_5.outputs.out
	);
	loop_and_42c45509(
		&data->b_6.data,
		false,
		false,
		&data->b_6.outputs.out
	);
}