# == Schema Information
#
# Table name: leagues
#
#  id         :integer          not null, primary key
#  name       :string(255)      not null
#  manager_id :integer          not null
#  created_at :datetime
#  updated_at :datetime
#

require 'spec_helper'

describe League do
  pending "add some examples to (or delete) #{__FILE__}"
end