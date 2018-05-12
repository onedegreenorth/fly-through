import csv
from datetime import datetime

startFile = 'uwb_gps_synced.csv'
outFile = 'uwb_gps_synced_int_time.csv'
timestampIndex = 4

with open(startFile,'r') as csvinput:
    with open(outFile, 'w') as csvoutput:
        writer = csv.writer(csvoutput, lineterminator='\n')
        reader = csv.reader(csvinput)

        all = []
        row = next(reader)
        row.append('when')
        all.append(row)

        data_row = next(reader)
        # Parse date string into date time object
        # timestamp format is '09/30/2016 17:54:18.080'
        first_dt = datetime.strptime(data_row[timestampIndex], '%m/%d/%Y %H:%M:%S.%f')
        # Keep track of start in milliseconds
        first_ms = (first_dt.minute * 60) + (first_dt.second * 1000) + (first_dt.microsecond / 1000)
        data_row.append(first_ms - first_ms)
        all.append(data_row)

        for row in reader:
            dt = datetime.strptime(row[timestampIndex], '%m/%d/%Y %H:%M:%S.%f')
            ms = (dt.minute * 60) + (dt.second * 1000) + (dt.microsecond / 1000)
            row.append(ms - first_ms)
            all.append(row)

        writer.writerows(all)