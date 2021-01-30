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
void setup_oneshot(s_data_oneshot *data) {
  data->lastval = false;
}
void loop_oneshot(s_data_oneshot *data, bool in, bool *out) {
  *out = (in && !data->lastval);
  data->lastval = in;
}
#define COUNT_oneshot 1
s_data_oneshot data_oneshot[COUNT_oneshot];
s_outputs_oneshot outputs_oneshot[COUNT_oneshot];

/* counter by Michele Trombetta*/
typedef struct {
  int value;
} s_data_counter;
typedef struct {
  int out;
} s_outputs_counter;
void setup_counter(s_data_counter *data) {
  data->value = 0;
}
void loop_counter(s_data_counter *data, bool inc, int *out) {
  if (inc)
    data->value++;
  *out = data->value;
}
#define COUNT_counter 1
s_data_counter data_counter[COUNT_counter];
s_outputs_counter outputs_counter[COUNT_counter];

/* setup main code */
void setup() {
  setup_oneshot(&data_oneshot[0]);
  setup_counter(&data_counter[0]);
}

/* loop main code */
void loop() {
  loop_oneshot(&data_oneshot[0], false, &outputs_oneshot[0].out);
  loop_counter(&data_counter[0], outputs_oneshot[0].out, &outputs_counter[0].out);
}