#include <stdlib.h>
#include <unistd.h>
#include <stdbool.h>

/* oneshot by AlienLogic */
typedef struct {
  bool lastval;
} s_data_oneshot;
typedef struct {
  bool out;
} s_outputs_oneshot;
typedef struct {
  s_data_oneshot data;
  s_outputs_oneshot outputs;
} s_instance_oneshot;
void setup_oneshot(s_data_oneshot *data) {
  data->lastval = false;
}
void loop_oneshot(s_data_oneshot *data, bool in, bool *out) {
  *out = (in && !data->lastval);
  data->lastval = in;
}

/* counter by Michele Trombetta*/
typedef struct {
  int value;
} s_data_counter;
typedef struct {
  int out;
} s_outputs_counter;
typedef struct {
  s_data_counter data;
  s_outputs_counter outputs;
} s_instance_counter;
void setup_counter(s_data_counter *data) {
  data->value = 0;
}
void loop_counter(s_data_counter *data, bool inc, int *out) {
  if (inc)
    data->value++;
  *out = data->value;
}


typedef struct {
  int value;
  s_instance_oneshot b1;
  s_instance_counter b2;
} s_data_main;
typedef struct {
  int out;
} s_outputs_main;

typedef struct {
  s_data_main data;
  s_outputs_main outputs;
} s_instance_main;
s_instance_main instance_main;


/* setup main code */
void setup(s_data_main *data) {
  setup_oneshot(&data->b1.data);
  setup_counter(&instance_main.data.b2.data);
}

/* loop main code */
void loop(s_data_main *data) {
  loop_oneshot(&instance_main.data.b1.data, false, &instance_main.data.b1.outputs.out);
  loop_counter(&instance_main.data.b2.data, instance_main.data.b1.outputs.out, &instance_main.data.b2.outputs.out);
}




void loop_main(_s_data_main* data, bool D1, bool D2, bool* D10, bool* D11) {

  *D10 = 
}